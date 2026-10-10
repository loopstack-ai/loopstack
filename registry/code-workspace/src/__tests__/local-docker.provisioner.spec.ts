import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_NAMESPACE, type ResolvedCodeWorkspaceOptions } from '../code-workspace.options.js';
import { LocalDockerProvisioner } from '../local-docker.provisioner.js';

/**
 * The labels and name prefix the default namespace produces. Derived here rather than written out, because
 * the point of the namespace is that an application chooses it — what the tests pin is the shape, and the
 * custom-namespace test at the end pins that choosing one changes everything.
 */
const WS_LABEL = `${DEFAULT_NAMESPACE}.workspace`;
const WF_LABEL = `${DEFAULT_NAMESPACE}.workflow`;
const NAME_PREFIX = DEFAULT_NAMESPACE.replace(/\./g, '-');

const WORKSPACE_ID = 'ws-1';
const WORKFLOW_ID = 'wf-abc-123';

/** The common single-repo checkout: one repo at the workspace root. */
const REPOS = [{ key: 'main', dir: '', primary: true }];
/** Bases are keyed by their provision config; the tests only need a stable key. */
const BASE_KEY = 'base-abc123';

/** The slice of dockerode's surface the provisioner uses, as the double implements it. */
interface FakeContainer {
  remove: (options?: { force?: boolean }) => Promise<void>;
}
interface FakeVolume {
  inspect: () => Promise<unknown>;
  remove: () => Promise<void>;
}

/**
 * A dockerode double: no test here may touch the real Docker socket. Individual tests override members.
 *
 * Each mock is declared with the signature it stands in for rather than inferred from its default — an
 * inferred `async () => []` types the mock as returning `never[]`, which rejects every `mockResolvedValue`
 * a test needs, and an inferred `() => …` rejects the `mockImplementation((id) => …)` that the
 * per-container and per-volume tests are built on.
 */
function fakeDocker() {
  const notFound = Object.assign(new Error('no such volume'), { statusCode: 404 });
  return {
    createContainer: vi.fn(),
    listContainers: vi.fn<(options?: unknown) => Promise<{ Id: string }[]>>(async () => []),
    getContainer: vi.fn<(id: string) => FakeContainer>(() => ({ remove: vi.fn(async () => {}) })),
    createVolume: vi.fn(async () => ({})),
    getVolume: vi.fn<(name: string) => FakeVolume>(() => ({
      inspect: vi.fn(async () => {
        throw notFound;
      }),
      remove: vi.fn(async () => {}),
    })),
    listVolumes: vi.fn<(options?: unknown) => Promise<{ Volumes: { Name: string }[] }>>(async () => ({
      Volumes: [],
    })),
    getImage: vi.fn(),
  };
}

/** Swap the provisioner's private dockerode instance for the double. */
function injectDocker(provisioner: LocalDockerProvisioner, docker: ReturnType<typeof fakeDocker>): void {
  (provisioner as unknown as { docker: unknown }).docker = docker;
}

function git(cwd: string, args: string[]): void {
  execFileSync('git', args, {
    cwd,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  });
}

/**
 * A claims service that behaves as the real one does for one exclusive key per base: the first claim takes
 * it, a second from a different run is refused with the holder, and releasing by id frees it.
 */
function fakeClaims() {
  const held = new Map<string, { claimId: string; scopeWorkflowId?: string }>();
  let next = 1;
  return {
    held,
    claim: vi.fn(async (request: never) => {
      const resources = (request as { resources: { key: string; scopeWorkflowId?: string }[] }).resources;
      const blocked = resources.filter(
        (resource) => held.has(resource.key) && held.get(resource.key)!.scopeWorkflowId !== resource.scopeWorkflowId,
      );
      if (blocked.length) {
        return {
          claimed: false,
          blocked: blocked.map((resource) => ({
            key: resource.key,
            capacity: 1,
            reason: 'held exclusively',
            holders: [held.get(resource.key)!],
          })),
        };
      }
      const claims = resources.map((resource) => {
        const existing = held.get(resource.key);
        if (existing) return existing;
        const claim = { claimId: `claim-${next++}`, scopeWorkflowId: resource.scopeWorkflowId };
        held.set(resource.key, claim);
        return claim;
      });
      return { claimed: true, claims };
    }),
    release: vi.fn(async (target: { claimIds?: string[] }) => {
      for (const [key, claim] of held) {
        if (target.claimIds?.includes(claim.claimId)) held.delete(key);
      }
      return 1;
    }),
    availability: vi.fn(async (keys: readonly string[]) =>
      keys.map((key) => ({
        key,
        capacity: 1,
        holders: held.has(key) ? [held.get(key)!] : [],
        free: held.has(key) ? 0 : 1,
      })),
    ),
  };
}

/** The run a build belongs to — what its claim is scoped to. */
const BUILDER = { workflowId: 'build-run-1', workspaceId: 'builder-ws' };

/** Build a provisioned base repo inside `<stateDir>/<ws>/base/workspace`: a git repo with a tracked file
 * and an ignored (build-artifact) `node_modules` dir, then flip the provisioned marker. */
async function openGeneration(provisioner: LocalDockerProvisioner, baseKey = BASE_KEY): Promise<string> {
  const { generation } = await provisioner.beginBaseGeneration(baseKey, {}, BUILDER);
  return generation;
}

function seedBase(
  provisioner: LocalDockerProvisioner,
  generation: string,
  dir = '',
  baseKey = BASE_KEY,
): { baseRepo: string; nodeModulesFile: string } {
  const baseRepo = path.join(
    (provisioner as unknown as { baseDir(key: string): string }).baseDir(baseKey),
    generation,
    'workspace',
    dir,
  );
  mkdirSync(baseRepo, { recursive: true });
  git(baseRepo, ['init', '-q']);
  writeFileSync(path.join(baseRepo, '.gitignore'), 'node_modules/\ndist/\n.husky/_/\n');
  writeFileSync(path.join(baseRepo, 'package.json'), '{"name":"base"}');
  const nm = path.join(baseRepo, 'node_modules', 'left-pad');
  mkdirSync(nm, { recursive: true });
  const nodeModulesFile = path.join(nm, 'index.js');
  writeFileSync(nodeModulesFile, 'module.exports = () => {};');
  // A partially-tracked dir: `.husky/pre-commit` is tracked, `.husky/_/` is ignored. This makes
  // `git ls-files --ignored --directory` emit both `.husky/_/` and its nested files — the overlap that
  // previously made `cp -al` fail with "are identical".
  const husky = path.join(baseRepo, '.husky');
  mkdirSync(path.join(husky, '_'), { recursive: true });
  writeFileSync(path.join(husky, 'pre-commit'), '#!/bin/sh\n');
  writeFileSync(path.join(husky, '_', 'husky.sh'), '# husky\n');
  git(baseRepo, ['add', '-A']);
  git(baseRepo, ['commit', '-q', '-m', 'base']);
  return { baseRepo, nodeModulesFile };
}

describe('LocalDockerProvisioner — checkout lifecycle', () => {
  let stateDir: string;
  let provisioner: LocalDockerProvisioner;
  let claims: ReturnType<typeof fakeClaims>;
  let docker: ReturnType<typeof fakeDocker>;

  beforeEach(() => {
    stateDir = mkdtempSync(path.join(os.tmpdir(), 'lse-'));
    const options: ResolvedCodeWorkspaceOptions = {
      agentPort: 3001,
      stateDir,
      namespace: DEFAULT_NAMESPACE,
      knownBaseKeys: [],
    };
    claims = fakeClaims();
    provisioner = new LocalDockerProvisioner(options, claims as never);
    docker = fakeDocker();
    injectDocker(provisioner, docker);
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  describe('dir helpers + provisioned marker', () => {
    it('resolves base and workflow dirs', () => {
      // Bases live outside every workspace, keyed by what they provision rather than by who asked.
      expect(provisioner.resolveBaseWorkspaceDir(BASE_KEY)).toBe(
        path.join(stateDir, '_bases', BASE_KEY, 'current', 'workspace'),
      );
      expect(provisioner.resolveBaseRepoDir(BASE_KEY, 'loopstack')).toBe(
        path.join(stateDir, '_bases', BASE_KEY, 'current', 'workspace', 'loopstack'),
      );
      // Caches and seed tars are global for the same reason: identical for every workspace, and large.
      expect(provisioner.resolveNpmCacheDir()).toBe(path.join(stateDir, '_cache', 'npm'));
      expect(provisioner.resolveSeedImagesDir()).toBe(path.join(stateDir, '_seed-images'));
      expect(provisioner.resolveWorkflowDir(WORKSPACE_ID, WORKFLOW_ID)).toBe(
        path.join(stateDir, WORKSPACE_ID, 'workflows', WORKFLOW_ID),
      );
    });

    it('reports the base as unprovisioned until a generation is published', async () => {
      expect(provisioner.isBaseProvisioned(BASE_KEY)).toBe(false);
      const generation = await openGeneration(provisioner);
      // An open generation is not yet the base: nothing reading `current` can see it.
      expect(provisioner.isBaseProvisioned(BASE_KEY)).toBe(false);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      expect(provisioner.isBaseProvisioned(BASE_KEY)).toBe(true);
      expect(provisioner.currentBaseGeneration(BASE_KEY)).toBe(generation);
    });
  });

  describe('ensureWorkflowCheckout', () => {
    it('throws when the base is not provisioned', async () => {
      await expect(provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS)).rejects.toThrow(
        /not provisioned/i,
      );
    });

    it('creates an isolated checkout on a wf/ branch with hardlinked node_modules, without mutating the base', async () => {
      const generation = await openGeneration(provisioner);
      const { nodeModulesFile } = seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);

      const { workspaceDir, created } = await provisioner.ensureWorkflowCheckout(
        WORKSPACE_ID,
        WORKFLOW_ID,
        BASE_KEY,
        REPOS,
      );

      expect(created).toBe(true);
      expect(workspaceDir).toBe(path.join(stateDir, WORKSPACE_ID, 'workflows', WORKFLOW_ID, 'workspace'));
      // Tracked file is present (real clone), and it is a git repo on its own wf/ branch.
      expect(existsSync(path.join(workspaceDir, 'package.json'))).toBe(true);
      const branch = execFileSync('git', ['-C', workspaceDir, 'rev-parse', '--abbrev-ref', 'HEAD'], {
        encoding: 'utf8',
      }).trim();
      expect(branch).toBe(`wf/${WORKFLOW_ID}`);

      // node_modules was restored by hardlink — same inode as the base, so no data was duplicated.
      const checkoutNm = path.join(workspaceDir, 'node_modules', 'left-pad', 'index.js');
      expect(existsSync(checkoutNm)).toBe(true);
      // Restored share-efficiently (clonefile or hardlink) — content matches the base without a fresh install.
      expect(readFileSync(checkoutNm, 'utf8')).toBe(readFileSync(nodeModulesFile, 'utf8'));

      // Overlapping ignored entries (`.husky/_/` dir + its nested files) were copied without error.
      expect(existsSync(path.join(workspaceDir, '.husky', '_', 'husky.sh'))).toBe(true);
      // The tracked hook came from the clone.
      expect(existsSync(path.join(workspaceDir, '.husky', 'pre-commit'))).toBe(true);

      // Base is still intact and unmodified.
      expect(existsSync(nodeModulesFile)).toBe(true);
    });

    it('builds the checkout through the staged API (clone -> link -> branch) and reflects existence', async () => {
      const generation = await openGeneration(provisioner);
      const { nodeModulesFile } = seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);

      expect(provisioner.workflowCheckoutExists(WORKSPACE_ID, WORKFLOW_ID)).toBe(false);

      await provisioner.cloneBaseIntoWorkflow(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);
      const workspaceDir = provisioner.resolveRepoDir(WORKSPACE_ID, WORKFLOW_ID);
      expect(existsSync(path.join(workspaceDir, 'package.json'))).toBe(true);
      expect(provisioner.workflowCheckoutExists(WORKSPACE_ID, WORKFLOW_ID)).toBe(true);

      await provisioner.linkWorkflowArtifacts(WORKSPACE_ID, WORKFLOW_ID);
      const checkoutNm = path.join(workspaceDir, 'node_modules', 'left-pad', 'index.js');
      expect(readFileSync(checkoutNm, 'utf8')).toBe(readFileSync(nodeModulesFile, 'utf8'));

      await provisioner.checkoutWorkflowBranch(WORKSPACE_ID, WORKFLOW_ID);
      const branch = execFileSync('git', ['-C', workspaceDir, 'rev-parse', '--abbrev-ref', 'HEAD'], {
        encoding: 'utf8',
      }).trim();
      expect(branch).toBe(`wf/${WORKFLOW_ID}`);

      await provisioner.discardWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID);
      expect(provisioner.workflowCheckoutExists(WORKSPACE_ID, WORKFLOW_ID)).toBe(false);
    });

    it('clones a nested repo as its own clean checkout, not as a copy of the base working tree', async () => {
      // The layout this exists for: the monorepo with a co-developed repo cloned into a git-ignored
      // sub-path of it. The parent's artifact sweep lists that sub-path (it IS ignored there), so without
      // an exclusion it would copy the base's working state straight over the nested clone.
      const generation = await openGeneration(provisioner);
      const outer = seedBase(provisioner, generation, 'loopstack');
      // The nested repo is ignored by its parent — exactly as `sandbox/*` is in the real monorepo.
      writeFileSync(path.join(outer.baseRepo, '.gitignore'), 'node_modules/\ndist/\n.husky/_/\nsandbox/\n');
      git(outer.baseRepo, ['add', '-A']);
      git(outer.baseRepo, ['commit', '-q', '-m', 'ignore sandbox']);
      const inner = seedBase(provisioner, generation, path.join('loopstack', 'sandbox', 'guest'));
      // Uncommitted work in the base's nested repo: it must NOT reach the checkout, because the checkout
      // gets a clone of that repo rather than a copy of the directory.
      writeFileSync(path.join(inner.baseRepo, 'dirty.txt'), 'only in the base worktree');
      await provisioner.publishBaseGeneration(BASE_KEY, generation);

      const repos = [
        { key: 'loopstack', dir: 'loopstack', primary: true },
        { key: 'guest', dir: 'loopstack/sandbox/guest' },
      ];
      await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, repos);

      const outerDir = provisioner.resolveRepoDir(WORKSPACE_ID, WORKFLOW_ID);
      const innerDir = provisioner.resolveRepoDir(WORKSPACE_ID, WORKFLOW_ID, 'guest');
      expect(innerDir).toBe(path.join(outerDir, 'sandbox', 'guest'));

      // A real clone of the nested repo: tracked content present, base's uncommitted file absent.
      expect(existsSync(path.join(innerDir, 'package.json'))).toBe(true);
      expect(existsSync(path.join(innerDir, 'dirty.txt'))).toBe(false);

      // Both repos are on the run's branch, under one name.
      for (const dir of [outerDir, innerDir]) {
        const branch = execFileSync('git', ['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD'], {
          encoding: 'utf8',
        }).trim();
        expect(branch).toBe(`wf/${WORKFLOW_ID}`);
      }

      // Each repo got its own artifacts, so the nested one is usable in its own right.
      expect(existsSync(path.join(outerDir, 'node_modules', 'left-pad', 'index.js'))).toBe(true);
      expect(existsSync(path.join(innerDir, 'node_modules', 'left-pad', 'index.js'))).toBe(true);
    });

    it('reports changed files per repo, each rooted at its own repo dir', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation, 'loopstack');
      seedBase(provisioner, generation, path.join('loopstack', 'sandbox', 'guest'));
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      const repos = [
        { key: 'loopstack', dir: 'loopstack', primary: true },
        { key: 'guest', dir: 'loopstack/sandbox/guest' },
      ];
      await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, repos);

      writeFileSync(path.join(provisioner.resolveRepoDir(WORKSPACE_ID, WORKFLOW_ID), 'touched.ts'), 'x');
      writeFileSync(path.join(provisioner.resolveRepoDir(WORKSPACE_ID, WORKFLOW_ID, 'guest'), 'other.ts'), 'y');

      const changes = await provisioner.listChangedFiles(WORKSPACE_ID, WORKFLOW_ID);
      expect(changes.map((c) => c.repoKey).sort()).toEqual(['guest', 'loopstack']);
      const guest = changes.find((c) => c.repoKey === 'guest')!;
      // Paths are relative to the repo, and the root is the repo — which is what a per-repo diff needs.
      expect(guest.paths).toEqual(['other.ts']);
      expect(guest.hostRoot).toBe(provisioner.resolveRepoDir(WORKSPACE_ID, WORKFLOW_ID, 'guest'));
    });

    it('reuses an existing checkout on a second call (created = false)', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);

      const first = await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);
      expect(first.created).toBe(true);
      const second = await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);
      expect(second.created).toBe(false);
      expect(second.workspaceDir).toBe(first.workspaceDir);
    });
  });

  describe('base generations', () => {
    it('leaves an in-flight checkout on the generation it cloned from, across a swap', async () => {
      // The property the whole design exists for. A refresh publishes a new generation while other
      // workspaces are mid-run; if a checkout followed `current`, its later stages would read a tree its
      // clone never saw — and the damage (a half-rewritten node_modules) is silent.
      const first = await openGeneration(provisioner);
      const { baseRepo } = seedBase(provisioner, first);
      writeFileSync(path.join(baseRepo, 'generation.txt'), 'first');
      git(baseRepo, ['add', '-A']);
      git(baseRepo, ['commit', '-q', '-m', 'first']);
      await provisioner.publishBaseGeneration(BASE_KEY, first);

      // A run clones its checkout off the published generation…
      await provisioner.cloneBaseIntoWorkflow(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);

      // …and a refresh publishes a new one underneath it, mid-run.
      const second = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);
      writeFileSync(path.join(second.workspaceDir, 'generation.txt'), 'second');
      await provisioner.publishBaseGeneration(BASE_KEY, second.generation);
      expect(provisioner.currentBaseGeneration(BASE_KEY)).toBe(second.generation);

      // The run's remaining stages still read the tree it cloned from.
      await provisioner.linkWorkflowArtifacts(WORKSPACE_ID, WORKFLOW_ID);
      const checkout = provisioner.resolveRepoDir(WORKSPACE_ID, WORKFLOW_ID);
      expect(readFileSync(path.join(checkout, 'generation.txt'), 'utf8')).toBe('first');
      // And the artifacts came from that generation too, not from the new one.
      expect(existsSync(path.join(checkout, 'node_modules', 'left-pad', 'index.js'))).toBe(true);
    });

    it('carries the install forward: a new generation starts as a copy of the published one', async () => {
      const first = await openGeneration(provisioner);
      const { nodeModulesFile } = seedBase(provisioner, first);
      await provisioner.publishBaseGeneration(BASE_KEY, first);

      const second = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);
      // A refresh updates rather than rebuilds — which is what makes sharing a base affordable.
      expect(existsSync(path.join(second.workspaceDir, 'node_modules', 'left-pad', 'index.js'))).toBe(true);
      expect(readFileSync(path.join(second.workspaceDir, 'node_modules', 'left-pad', 'index.js'), 'utf8')).toBe(
        readFileSync(nodeModulesFile, 'utf8'),
      );
      // An unpublished generation is invisible: the base still resolves to the published one.
      expect(provisioner.currentBaseGeneration(BASE_KEY)).toBe(first);
      await provisioner.discardBaseGeneration(BASE_KEY, second.generation);
    });

    /**
     * The hold on a base is a claim, so there is no lease to refresh and no stale lock to break: it lives
     * exactly as long as the run that took it. These pin what replaced that machinery.
     */
    it('refuses a second provision of the same base instead of waiting for the first', async () => {
      // Waiting used to be the kinder answer, but it held the waiting run's task slot for the whole build.
      const first = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);

      await expect(
        provisioner.beginBaseGeneration(BASE_KEY, {}, { workflowId: 'other-run', workspaceId: 'builder-ws' }),
      ).rejects.toThrow(/being provisioned by another run/);

      await provisioner.discardBaseGeneration(BASE_KEY, first.generation);
    });

    it('names the run that holds it, so the refusal says what to wait for', async () => {
      await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);

      await expect(
        provisioner.beginBaseGeneration(BASE_KEY, {}, { workflowId: 'other-run', workspaceId: 'builder-ws' }),
      ).rejects.toThrow(/build-run-1/);
    });

    it('frees the base when the build publishes', async () => {
      const first = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);
      seedBase(provisioner, first.generation);
      await provisioner.publishBaseGeneration(BASE_KEY, first.generation);

      // Another run may build it again — the previous claim is released, not merely expired.
      const second = await provisioner.beginBaseGeneration(
        BASE_KEY,
        {},
        {
          workflowId: 'other-run',
          workspaceId: 'builder-ws',
        },
      );
      expect(second.generation).not.toBe(first.generation);
    });

    it('frees the base when the build is discarded', async () => {
      const first = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);
      await provisioner.discardBaseGeneration(BASE_KEY, first.generation);

      await expect(
        provisioner.beginBaseGeneration(BASE_KEY, {}, { workflowId: 'other-run', workspaceId: 'builder-ws' }),
      ).resolves.toBeDefined();
    });

    it('releases only its own claim, by id', async () => {
      // The run may hold others — its unit of a concurrency limit, say — and publishing a base must not
      // release those.
      const first = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);
      await provisioner.discardBaseGeneration(BASE_KEY, first.generation);

      expect(claims.release).toHaveBeenCalledWith({ claimIds: [expect.stringMatching(/^claim-/)] });
    });

    it('frees nothing if the build failed before it claimed', async () => {
      // A base that was never claimed in this process is already free: the claim would belong to a run that
      // is gone, and a claim is only as alive as its run.
      await provisioner.discardBaseGeneration('never-built', 'gen-nope');

      expect(claims.release).not.toHaveBeenCalled();
    });

    it('leaves a base alone while a provision holds its lock — the unpublished generation is live', async () => {
      const first = await openGeneration(provisioner);
      seedBase(provisioner, first);
      await provisioner.publishBaseGeneration(BASE_KEY, first);
      // In flight: not current, referenced by nothing, and mounted into a running container.
      const building = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);
      expect(await provisioner.collectBaseGenerations()).toEqual([]);
      expect(existsSync(path.join(stateDir, '_bases', BASE_KEY, building.generation))).toBe(true);
      await provisioner.discardBaseGeneration(BASE_KEY, building.generation);
    });

    it('collects generations nothing points at, keeping current and any a checkout still references', async () => {
      const first = await openGeneration(provisioner);
      seedBase(provisioner, first);
      await provisioner.publishBaseGeneration(BASE_KEY, first);
      // A live checkout pins the generation it was built from.
      await provisioner.cloneBaseIntoWorkflow(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);

      const second = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);
      await provisioner.publishBaseGeneration(BASE_KEY, second.generation);
      const third = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);
      await provisioner.publishBaseGeneration(BASE_KEY, third.generation);

      const removed = await provisioner.collectBaseGenerations();
      // `second` is neither current nor referenced — it is the only one that goes.
      expect(removed).toEqual([{ baseKey: BASE_KEY, generation: second.generation }]);
      expect(provisioner.currentBaseGeneration(BASE_KEY)).toBe(third.generation);
      // The pinned generation survives, so the running checkout keeps a coherent view.
      expect(existsSync(path.join(stateDir, '_bases', BASE_KEY, first))).toBe(true);
    });
  });

  describe('removeBase', () => {
    it('removes the whole base, published generation included — what the collector keeps forever', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);

      await provisioner.removeBase(BASE_KEY);
      expect(existsSync(path.join(stateDir, '_bases', BASE_KEY))).toBe(false);
    });

    it('is idempotent, so a half-finished cleanup can simply be re-run', async () => {
      await expect(provisioner.removeBase('never-existed')).resolves.toBeUndefined();
    });

    it('refuses while a live checkout reads one of its generations', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      await provisioner.cloneBaseIntoWorkflow(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);

      await expect(provisioner.removeBase(BASE_KEY)).rejects.toThrow(/live checkout/);
      expect(existsSync(path.join(stateDir, '_bases', BASE_KEY))).toBe(true);
    });

    it('refuses while a provision holds the lock — its generation is mounted into a container', async () => {
      const building = await provisioner.beginBaseGeneration(BASE_KEY, {}, BUILDER);
      await expect(provisioner.removeBase(BASE_KEY)).rejects.toThrow(/being provisioned/);
      await provisioner.discardBaseGeneration(BASE_KEY, building.generation);
    });
  });

  describe('setRepoIdentity', () => {
    it('writes the author into the checkout, so a commit is attributed without the agent configuring it', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);

      await provisioner.setRepoIdentity(WORKSPACE_ID, WORKFLOW_ID, 'Jakob Klippel', 'jakob@example.com');

      // Read it back the way git itself resolves it for a commit made in this checkout — local config,
      // which is what beats whatever global identity the container image happens to carry.
      const repoDir = provisioner.resolveRepoDir(WORKSPACE_ID, WORKFLOW_ID);
      const name = execFileSync('git', ['-C', repoDir, 'config', '--local', 'user.name']).toString().trim();
      const email = execFileSync('git', ['-C', repoDir, 'config', '--local', 'user.email']).toString().trim();
      expect(name).toBe('Jakob Klippel');
      expect(email).toBe('jakob@example.com');
    });
  });

  describe('removeWorkflowCheckout', () => {
    it('deletes the workflow dir locally (no container), leaving the base untouched', async () => {
      const generation = await openGeneration(provisioner);
      const { baseRepo } = seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);
      const workflowDir = provisioner.resolveWorkflowDir(WORKSPACE_ID, WORKFLOW_ID);
      expect(existsSync(workflowDir)).toBe(true);

      // No throwaway container: files are host-owned, so removal is a local rm.
      const provisionSpy = vi.spyOn(provisioner, 'provision');
      const teardownSpy = vi.spyOn(provisioner, 'teardown');

      await provisioner.removeWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID);

      expect(provisionSpy).not.toHaveBeenCalled();
      expect(teardownSpy).not.toHaveBeenCalled();
      // Workflow dir gone; base kept.
      expect(existsSync(workflowDir)).toBe(false);
      expect(existsSync(baseRepo)).toBe(true);
      // The checkout's dind volumes are swept with it (label-filtered; none here, so nothing removed).
      expect(docker.listVolumes).toHaveBeenCalledWith({
        filters: {
          label: [`${WS_LABEL}=${WORKSPACE_ID}`, `${WF_LABEL}=${WORKFLOW_ID}`],
        },
      });
    });

    it('reclaims containers, then volumes, then files — a stuck volume leaves the checkout intact', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);
      const workflowDir = provisioner.resolveWorkflowDir(WORKSPACE_ID, WORKFLOW_ID);

      // A zombie container holds the dind volume: containers are force-removed first, then the volume
      // removal still fails (in-use elsewhere) — the files must survive so the reclaim can be retried.
      const containerRemove = vi.fn(async () => {});
      docker.listContainers.mockResolvedValue([{ Id: 'z'.repeat(64) }]);
      docker.getContainer.mockReturnValue({ remove: containerRemove });
      docker.listVolumes.mockResolvedValue({ Volumes: [{ Name: 'vol-stuck' }] });
      docker.getVolume.mockReturnValue({
        inspect: vi.fn(),
        remove: vi.fn(async () => {
          throw Object.assign(new Error('volume is in use'), { statusCode: 409 });
        }),
      });

      await expect(provisioner.removeWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID)).rejects.toThrow(/in use/);
      expect(containerRemove).toHaveBeenCalledWith({ force: true });
      // Durable record last: the failed volume removal must NOT have cost us the checkout.
      expect(existsSync(workflowDir)).toBe(true);

      // Once the volume frees up, the same call succeeds — cleanly re-runnable.
      docker.listVolumes.mockResolvedValue({ Volumes: [] });
      await provisioner.removeWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID);
      expect(existsSync(workflowDir)).toBe(false);
    });

    it('force-removes labeled containers, tolerating already-gone ones', async () => {
      const removedOk = vi.fn(async () => {});
      const removed404 = vi.fn(async () => {
        throw Object.assign(new Error('no such container'), { statusCode: 404 });
      });
      docker.listContainers.mockResolvedValue([{ Id: 'a'.repeat(64) }, { Id: 'b'.repeat(64) }]);
      docker.getContainer.mockImplementation((id: string) => ({
        remove: id.startsWith('a') ? removedOk : removed404,
      }));

      await provisioner.removeWorkflowContainers(WORKSPACE_ID, WORKFLOW_ID);
      expect(docker.listContainers).toHaveBeenCalledWith({
        all: true,
        filters: {
          label: [`${WS_LABEL}=${WORKSPACE_ID}`, `${WF_LABEL}=${WORKFLOW_ID}`],
        },
      });
      expect(removedOk).toHaveBeenCalledTimes(1);
      expect(removed404).toHaveBeenCalledTimes(1);
    });
  });

  describe('discardWorkflowCheckout', () => {
    it('removes the whole workflow dir, including claude-state and the repo marker', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation, 'repo');
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      await provisioner.cloneBaseIntoWorkflow(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, [{ key: 'main', dir: 'repo' }]);
      const workflowDir = provisioner.resolveWorkflowDir(WORKSPACE_ID, WORKFLOW_ID);
      // Simulate the sibling state a run creates beside the workspace (outside the mount).
      mkdirSync(path.join(workflowDir, 'claude-state'), { recursive: true });
      writeFileSync(path.join(workflowDir, 'claude-state', 'config.json'), '{}');
      expect(existsSync(path.join(workflowDir, '.repos.json'))).toBe(true);

      await provisioner.discardWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID);

      // No half-discard residue: the entire dir is gone, not just its workspace subdir.
      expect(existsSync(workflowDir)).toBe(false);
    });
  });

  describe('provision — privileged + named volumes', () => {
    /** Container double: starts, reports running with a published agent port. */
    function stubContainerLifecycle(): { payloads: Record<string, unknown>[] } {
      const payloads: Record<string, unknown>[] = [];
      docker.createContainer.mockImplementation(async (payload: Record<string, unknown>) => {
        payloads.push(payload);
        return {
          id: 'c'.repeat(64),
          start: vi.fn(async () => {}),
          inspect: vi.fn(async () => ({
            State: { Running: true },
            NetworkSettings: { Ports: { '3001/tcp': [{ HostPort: '40001' }] } },
          })),
        };
      });
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true })),
      );
      return { payloads };
    }

    it('maps privileged and named volumes into the container payload and ensures labeled volumes', async () => {
      const { payloads } = stubContainerLifecycle();

      await provisioner.provision({
        image: 'img:latest',
        workspaceId: WORKSPACE_ID,
        workflowId: WORKFLOW_ID,
        privileged: true,
        namedVolumes: [{ name: 'vol-dind', containerPath: '/var/lib/docker' }],
      });

      const hostConfig = payloads[0].HostConfig as { Privileged?: boolean; Binds?: string[] };
      expect(hostConfig.Privileged).toBe(true);
      expect(hostConfig.Binds).toContain('vol-dind:/var/lib/docker');
      // Volume was ensured with the sweepable labels (it did not exist — the double's inspect throws 404).
      expect(docker.createVolume).toHaveBeenCalledWith({
        Name: 'vol-dind',
        Labels: {
          [WS_LABEL]: WORKSPACE_ID,
          [WF_LABEL]: WORKFLOW_ID,
        },
      });
    });

    it('stays unprivileged and volume-free by default', async () => {
      const { payloads } = stubContainerLifecycle();

      await provisioner.provision({ image: 'img:latest' });

      const hostConfig = payloads[0].HostConfig as { Privileged?: boolean; Binds?: string[] };
      expect(hostConfig.Privileged).toBeUndefined();
      expect(docker.createVolume).not.toHaveBeenCalled();
    });
  });

  describe('exportImageTar', () => {
    function stubImage(id: string, bytes: string): { get: ReturnType<typeof vi.fn> } {
      const get = vi.fn(async () => Readable.from([Buffer.from(bytes)]));
      docker.getImage.mockReturnValue({ inspect: vi.fn(async () => ({ Id: id })), get });
      return { get };
    }

    it('writes the tar + .id, skips when current, and re-exports on a new image Id', async () => {
      const tarPath = path.join(provisioner.resolveSeedImagesDir(), 'img-latest.tar');

      const first = stubImage('sha256:aaa', 'tar-v1');
      await provisioner.exportImageTar('img:latest');
      expect(readFileSync(tarPath, 'utf8')).toBe('tar-v1');
      expect(readFileSync(`${tarPath}.id`, 'utf8')).toBe('sha256:aaa');
      expect(first.get).toHaveBeenCalledTimes(1);

      // Same Id — the export is skipped entirely.
      const second = stubImage('sha256:aaa', 'tar-v1-again');
      await provisioner.exportImageTar('img:latest');
      expect(second.get).not.toHaveBeenCalled();
      expect(readFileSync(tarPath, 'utf8')).toBe('tar-v1');

      // Refreshed host image (new Id) — re-exported.
      const third = stubImage('sha256:bbb', 'tar-v2');
      await provisioner.exportImageTar('img:latest');
      expect(third.get).toHaveBeenCalledTimes(1);
      expect(readFileSync(tarPath, 'utf8')).toBe('tar-v2');
      expect(readFileSync(`${tarPath}.id`, 'utf8')).toBe('sha256:bbb');
    });

    it('survives two workspaces exporting the same image at once', async () => {
      // The seed store is global, so concurrent dind provisions export the same image side by side. With a
      // shared temp name they would interleave into one file and rename a corrupt multi-GB tar over it.
      const tarPath = path.join(provisioner.resolveSeedImagesDir(), 'img-latest.tar');
      let served = 0;
      docker.getImage.mockReturnValue({
        inspect: vi.fn(async () => ({ Id: 'sha256:aaa' })),
        // Each export streams its own distinguishable payload, slowly enough to overlap.
        get: vi.fn(async () => {
          const body = `tar-${(served += 1)}`;
          return Readable.from(
            (async function* () {
              for (const chunk of body.split('')) {
                await new Promise((resolve) => setTimeout(resolve, 1));
                yield Buffer.from(chunk);
              }
            })(),
          );
        }),
      });

      await Promise.all([provisioner.exportImageTar('img:latest'), provisioner.exportImageTar('img:latest')]);

      // Whichever finished last wins, but it is a *complete* payload — never a mix of the two.
      expect(['tar-1', 'tar-2']).toContain(readFileSync(tarPath, 'utf8'));
      // And no temp residue is left behind.
      const residue = readdirSync(provisioner.resolveSeedImagesDir()).filter((f) => f.endsWith('.tmp'));
      expect(residue).toEqual([]);
    });

    it('removes its temp file when the export stream fails mid-way', async () => {
      const tarPath = path.join(provisioner.resolveSeedImagesDir(), 'img-latest.tar');
      // A stream that errors after the first chunk — a crashed multi-GB `docker save` in miniature.
      docker.getImage.mockReturnValue({
        inspect: vi.fn(async () => ({ Id: 'sha256:ccc' })),
        get: vi.fn(async () =>
          Readable.from(
            (function* () {
              yield Buffer.from('partial');
              throw new Error('daemon connection lost');
            })(),
          ),
        ),
      });

      await expect(provisioner.exportImageTar('img:latest')).rejects.toThrow(/connection lost/);
      // No multi-GB residue and no plausible-looking tar: both files absent, next export starts clean.
      expect(readdirSync(provisioner.resolveSeedImagesDir()).filter((f) => f.endsWith('.tmp'))).toEqual([]);
      expect(existsSync(tarPath)).toBe(false);
      expect(existsSync(`${tarPath}.id`)).toBe(false);
    });
  });

  describe('workspace-level inventory + reclaim', () => {
    it('lists workspace states with their checkouts and sizes', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);

      const states = await provisioner.listWorkspaceStates();
      expect(states).toHaveLength(1);
      expect(states[0].workspaceId).toBe(WORKSPACE_ID);
      expect(states[0].sizeBytes).toBeGreaterThan(0);
      expect(states[0].checkouts).toHaveLength(1);
      expect(states[0].checkouts[0].workflowId).toBe(WORKFLOW_ID);
      expect(states[0].checkouts[0].sizeBytes).toBeGreaterThan(0);
      expect(states[0].checkouts[0].modifiedAt).toMatch(/^\d{4}-/);
    });

    it('removeWorkspaceState reclaims containers and volumes by workspace label, then the whole dir', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);
      const wsDir = provisioner.resolveWorkflowDir(WORKSPACE_ID, WORKFLOW_ID);
      expect(existsSync(wsDir)).toBe(true);

      await provisioner.removeWorkspaceState(WORKSPACE_ID);

      expect(docker.listContainers).toHaveBeenCalledWith({
        all: true,
        filters: { label: [`${WS_LABEL}=${WORKSPACE_ID}`] },
      });
      expect(docker.listVolumes).toHaveBeenCalledWith({
        filters: { label: [`${WS_LABEL}=${WORKSPACE_ID}`] },
      });
      expect(existsSync(wsDir)).toBe(false);
      // The shared base is untouched: it belongs to every workspace running that template, not to this one.
      expect(provisioner.isBaseProvisioned(BASE_KEY)).toBe(true);
    });

    it('is idempotent — reclaiming a workspace with no state dir succeeds', async () => {
      await expect(provisioner.removeWorkspaceState('11111111-2222-3333-4444-555555555555')).resolves.toBeUndefined();
    });

    it('scopes the listing (and its docker filters) to one workspace when given', async () => {
      const generation = await openGeneration(provisioner);
      seedBase(provisioner, generation);
      await provisioner.publishBaseGeneration(BASE_KEY, generation);
      // Two workspaces sharing the one base — which is the point of keying a base by what it provisions.
      await provisioner.ensureWorkflowCheckout(WORKSPACE_ID, WORKFLOW_ID, BASE_KEY, REPOS);
      await provisioner.ensureWorkflowCheckout('ws-2', WORKFLOW_ID, BASE_KEY, REPOS);

      const scoped = await provisioner.listWorkspaceStates(WORKSPACE_ID);
      expect(scoped.map((s) => s.workspaceId)).toEqual([WORKSPACE_ID]);
      expect(await provisioner.listWorkspaceStates('11111111-2222-3333-4444-555555555555')).toEqual([]);
      expect((await provisioner.listWorkspaceStates()).map((s) => s.workspaceId).sort()).toEqual([
        WORKSPACE_ID,
        'ws-2',
      ]);

      await provisioner.listContainers(WORKSPACE_ID);
      expect(docker.listContainers).toHaveBeenLastCalledWith({
        all: true,
        filters: { label: [`${WS_LABEL}=${WORKSPACE_ID}`] },
      });
      await provisioner.listVolumes(WORKSPACE_ID);
      expect(docker.listVolumes).toHaveBeenLastCalledWith({
        filters: { label: [`${WS_LABEL}=${WORKSPACE_ID}`] },
      });
    });
  });

  describe('the namespace', () => {
    /**
     * Everything the provisioner creates is named from one option, and everything it sweeps is found by the
     * same one. So two applications with different namespaces cannot see — or remove — each other's
     * containers and volumes, which is what makes the module shareable.
     */
    const namespaced = (namespace: string) =>
      new LocalDockerProvisioner({ agentPort: 3001, stateDir, namespace, knownBaseKeys: [] }, fakeClaims() as never);

    it('builds the labels it sweeps by from the configured namespace', async () => {
      const other = namespaced('acme.sandbox');
      (other as unknown as { docker: unknown }).docker = docker;

      await other.removeWorkflowContainers(WORKSPACE_ID, WORKFLOW_ID);

      expect(docker.listContainers).toHaveBeenLastCalledWith({
        all: true,
        filters: {
          label: [`acme.sandbox.workspace=${WORKSPACE_ID}`, `acme.sandbox.workflow=${WORKFLOW_ID}`],
        },
      });
    });

    it('builds volume names from it too, with the dots as dashes', () => {
      expect(namespaced('acme.sandbox').resolveDindVolumeName(WORKSPACE_ID, WORKFLOW_ID, 'agent')).toBe(
        `acme-sandbox-dind-${WORKSPACE_ID}-${WORKFLOW_ID}-agent`,
      );
    });
  });

  describe('dind volumes', () => {
    it('derives a deterministic per-role volume name from the verbatim ids', () => {
      expect(provisioner.resolveDindVolumeName(WORKSPACE_ID, WORKFLOW_ID, 'agent')).toBe(
        `${NAME_PREFIX}-dind-${WORKSPACE_ID}-${WORKFLOW_ID}-agent`,
      );
      expect(provisioner.resolveDindVolumeName(WORKSPACE_ID, WORKFLOW_ID, 'app')).toBe(
        `${NAME_PREFIX}-dind-${WORKSPACE_ID}-${WORKFLOW_ID}-app`,
      );
    });

    it('removes labeled volumes, tolerating already-gone ones and propagating other failures', async () => {
      const removedOk = vi.fn(async () => {});
      const removed404 = vi.fn(async () => {
        throw Object.assign(new Error('no such volume'), { statusCode: 404 });
      });
      docker.listVolumes.mockResolvedValue({ Volumes: [{ Name: 'vol-a' }, { Name: 'vol-b' }] });
      docker.getVolume.mockImplementation((name: string) => ({
        inspect: vi.fn(),
        remove: name === 'vol-a' ? removedOk : removed404,
      }));

      await provisioner.removeWorkflowVolumes(WORKSPACE_ID, WORKFLOW_ID);
      expect(removedOk).toHaveBeenCalledTimes(1);
      expect(removed404).toHaveBeenCalledTimes(1);

      // A volume still in use (409) is a real failure the caller must see.
      docker.listVolumes.mockResolvedValue({ Volumes: [{ Name: 'vol-busy' }] });
      docker.getVolume.mockImplementation(() => ({
        inspect: vi.fn(),
        remove: vi.fn(async () => {
          throw Object.assign(new Error('volume is in use'), { statusCode: 409 });
        }),
      }));
      await expect(provisioner.removeWorkflowVolumes(WORKSPACE_ID, WORKFLOW_ID)).rejects.toThrow(/in use/);
    });
  });
});
