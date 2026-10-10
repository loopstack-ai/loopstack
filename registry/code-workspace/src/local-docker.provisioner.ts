import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream, existsSync, readFileSync, realpathSync, unlinkSync } from 'node:fs';
import { chmod, copyFile, mkdir, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { ResourceClaimService } from '@loopstack/claims';
import { baseResource } from './base-resource.js';
import { CODE_WORKSPACE_OPTIONS, type ResolvedCodeWorkspaceOptions } from './code-workspace.options.js';
import type {
  BaseBuildOwner,
  BaseGenerationInfo,
  BaseStateInfo,
  CheckoutInfo,
  CheckoutRepo,
  CodeWorkspaceProvisioner,
  ContainerInfo,
  ProvisionOptions,
  ProvisionedContainer,
  RepoChanges,
  SharedStateInfo,
  VolumeInfo,
  WorkflowCheckout,
  WorkspaceStateInfo,
} from './code-workspace.provisioner.js';
import { type RepoChangeCount, parseShortStat } from './short-stat.js';

/** Postgres/Redis are always local, blank, and die with the container, so a single fixed db name is safe. */
const DEFAULT_DB_NAME = 'app';

const run = promisify(execFile);

/** The base-provisioning container's workflow label — a fixed key, not a workflow row. */
const BASE_WORKFLOW_KEY = 'base';
/**
 * Local-Docker implementation of {@link CodeWorkspaceProvisioner}: dockerode container lifecycle over
 * host-filesystem base/checkout dirs, using host `git clone --local` + `cp -al` hardlinks. Uses an explicit
 * teardown (no `--rm`) so a crashed container's logs survive for inspection.
 *
 * **Keys are ids, used verbatim.** `workspaceId`/`workflowId` are trusted, runtime-generated ids from the
 * loopstack engine — never display names — and appear unmodified in directory paths, `wf/<id>` branch
 * names, container/volume names, and labels. That makes every on-disk/docker resource name reversible to
 * its owning DB row with certainty (no sanitization, no collisions, no guessing during cleanup). Callers
 * must pass `ctx.workspaceId`/`ctx.workflowId`, nothing user-authored.
 *
 * @providedBy CodeWorkspaceModule (bound to the CODE_WORKSPACE_PROVISIONER token)
 */
@Injectable()
export class LocalDockerProvisioner implements CodeWorkspaceProvisioner {
  private readonly logger = new Logger(LocalDockerProvisioner.name);
  private readonly docker = new Docker();
  /** The claim each base build holds, so releasing one touches nothing else the run holds. */
  private readonly baseClaims = new Map<string, string>();

  constructor(
    @Inject(CODE_WORKSPACE_OPTIONS) private readonly options: ResolvedCodeWorkspaceOptions,
    private readonly claims: ResourceClaimService,
  ) {}

  async provision(opts: ProvisionOptions): Promise<ProvisionedContainer> {
    const runId = randomUUID().slice(0, 8);
    const { agentPort } = this.options;

    const env = [`AGENT_PORT=${agentPort}`, 'WORKSPACE_ROOT=/workspace'];
    // Conditionally boot Postgres/Redis and expose their connection URLs — blank, local, disposable.
    if (opts.services?.length) {
      env.push('ENABLE_SERVICES=1', `POSTGRES_DB=${DEFAULT_DB_NAME}`);
      if (opts.services.includes('postgres')) {
        env.push(`DATABASE_URL=postgres://postgres:admin@localhost:5432/${DEFAULT_DB_NAME}`);
      }
      if (opts.services.includes('redis')) env.push('REDIS_URL=redis://localhost:6379');
    }
    for (const [key, value] of Object.entries(opts.env ?? {})) env.push(`${key}=${value}`);

    // Bind-mount the workflow (or base) workspace so it survives teardown; the caller may add sibling mounts.
    const binds: string[] = [];
    if (opts.mountDir) {
      await mkdir(opts.mountDir, { recursive: true });
      binds.push(`${opts.mountDir}:/workspace`);
    }
    for (const bind of opts.extraBinds ?? []) {
      await mkdir(bind.split(':')[0], { recursive: true });
      binds.push(bind);
    }
    // Named volumes (inner-daemon data-roots) go into Binds verbatim — no host dir to create. Ensured
    // here with the workspace/workflow labels so leftovers are sweepable just like containers.
    for (const volume of opts.namedVolumes ?? []) {
      await this.ensureVolume(volume.name, opts.workspaceId, opts.workflowId);
      binds.push(`${volume.name}:${volume.containerPath}`);
    }

    // Always publish the agent port (health + workspace routes); publish any extra ports too.
    const exposedPorts: Record<string, Record<string, never>> = { [`${agentPort}/tcp`]: {} };
    const portBindings: Record<string, { HostPort: string }[]> = { [`${agentPort}/tcp`]: [{ HostPort: '' }] };
    for (const port of opts.extraPorts ?? []) {
      exposedPorts[`${port}/tcp`] = {};
      portBindings[`${port}/tcp`] = [{ HostPort: '' }];
    }

    // Name + label the container with its workspace/workflow so a leftover one (e.g. a crashed sub-workflow)
    // is identifiable in `docker ps` and can be swept manually by label. There is no automatic sweep.
    const ws = opts.workspaceId?.slice(0, 8);
    const wf = opts.workflowId?.slice(0, 8);
    const name = [this.namePrefix, ws, wf, runId].filter(Boolean).join('-');

    const container = await this.docker.createContainer({
      Image: opts.image,
      name,
      Labels: {
        [this.runLabel]: runId,
        ...(opts.workspaceId ? { [this.workspaceLabel]: opts.workspaceId } : {}),
        ...(opts.workflowId ? { [this.workflowLabel]: opts.workflowId } : {}),
      },
      Env: env,
      ExposedPorts: exposedPorts,
      HostConfig: {
        // Publish to random host ports; AutoRemove stays off so teardown is explicit and crash logs survive.
        PortBindings: portBindings,
        AutoRemove: false,
        ...(binds.length ? { Binds: binds } : {}),
        // Privileged only for the dind images (self-engineering) — their inner dockerd needs it.
        ...(opts.privileged ? { Privileged: true } : {}),
      },
    });

    await container.start();

    try {
      const agentUrl = `http://localhost:${await this.resolveHostPort(container, agentPort)}`;
      await this.waitForHealth(agentUrl);

      let portUrls: Record<number, string> | undefined;
      if (opts.extraPorts?.length) {
        portUrls = {};
        for (const port of opts.extraPorts) {
          portUrls[port] = `http://localhost:${await this.resolveHostPort(container, port)}`;
        }
      }

      this.logger.log(`Provisioned container ${container.id.slice(0, 12)} from ${opts.image} at ${agentUrl}`);
      return { containerId: container.id, agentUrl, portUrls };
    } catch (error) {
      // Best-effort cleanup of the half-provisioned container — never mask the original failure.
      await this.teardown(container.id).catch(() => undefined);
      throw error;
    }
  }

  async teardown(containerId: string): Promise<void> {
    if (!containerId) return;
    await this.docker.getContainer(containerId).remove({ force: true });
    this.logger.log(`Removed container ${containerId.slice(0, 12)}`);
  }

  // ── Persistent state: base + per-workflow checkouts ──────────────────────────────────────────────────

  resolveBaseWorkspaceDir(baseKey: string): string {
    return path.join(this.baseDir(baseKey), 'current', 'workspace');
  }

  resolveBaseRepoDir(baseKey: string, dir: string): string {
    const base = this.resolveBaseWorkspaceDir(baseKey);
    return dir ? path.join(base, dir) : base;
  }

  resolveNpmCacheDir(): string {
    return path.join(this.stateRoot(), '_cache', 'npm');
  }

  resolveSeedImagesDir(): string {
    return path.join(this.stateRoot(), '_seed-images');
  }

  // ── Base generations ────────────────────────────────────────────────────────────────────────────────

  isBaseProvisioned(baseKey: string): boolean {
    return existsSync(path.join(this.baseDir(baseKey), 'current', '.provisioned'));
  }

  currentBaseGeneration(baseKey: string): string | undefined {
    const link = path.join(this.baseDir(baseKey), 'current');
    if (!existsSync(link)) return undefined;
    try {
      return path.basename(realpathSync(link));
    } catch {
      return undefined;
    }
  }

  async beginBaseGeneration(
    baseKey: string,
    meta: unknown,
    owner: BaseBuildOwner,
  ): Promise<{ generation: string; workspaceDir: string }> {
    const base = this.baseDir(baseKey);
    await mkdir(base, { recursive: true });
    await this.claimBase(baseKey, owner);
    try {
      // What this base IS, in readable form — a directory named by a hash is otherwise unidentifiable.
      await writeFile(path.join(base, 'meta.json'), JSON.stringify(meta, null, 2));
      const generation = `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const genDir = path.join(base, generation);
      const current = this.currentBaseGeneration(baseKey);
      if (current) {
        // Copy-on-write from the published generation: the install and build carry over, so a refresh
        // updates rather than rebuilds. A real copy where clonefile is unavailable — never hardlinks: the
        // build that follows rewrites `dist/*` in place, which through a shared inode would rewrite the
        // published generation and every checkout linked to it.
        await this.cloneOrCopy(path.join(base, current), genDir);
        // The copy inherits the marker; it is not provisioned until this generation is published.
        await rm(path.join(genDir, '.provisioned'), { force: true });
      } else {
        await mkdir(path.join(genDir, 'workspace'), { recursive: true });
      }
      return { generation, workspaceDir: path.join(genDir, 'workspace') };
    } catch (error) {
      await this.releaseBase(baseKey);
      throw error;
    }
  }

  async publishBaseGeneration(baseKey: string, generation: string): Promise<void> {
    const base = this.baseDir(baseKey);
    const genDir = path.join(base, generation);
    await writeFile(path.join(genDir, '.provisioned'), new Date().toISOString());
    // Atomic swap: write the new link under a temporary name, then rename it over `current`. A reader
    // resolves one or the other, never a half-written pointer.
    const staging = path.join(base, `.current-${generation}`);
    await rm(staging, { force: true });
    await symlink(generation, staging);
    await rename(staging, path.join(base, 'current'));
    await this.releaseBase(baseKey);
    this.logger.log(`Published base ${baseKey} generation ${generation}`);
  }

  async discardBaseGeneration(baseKey: string, generation: string): Promise<void> {
    await rm(path.join(this.baseDir(baseKey), generation), { recursive: true, force: true });
    await this.releaseBase(baseKey);
  }

  async removeBase(baseKey: string): Promise<void> {
    const dir = this.baseDir(baseKey);
    if (!existsSync(dir)) return;
    // Both checks are refusals rather than skips: a caller removing a whole base has decided that nothing
    // provisions it any more, and the two things that can still be reading it are facts on disk, not opinions.
    if (await this.isBaseLocked(baseKey)) {
      throw new Error(`Base ${baseKey} is being provisioned — its generations are in use by that build.`);
    }
    const held = [...(await this.referencedGenerations())].filter((ref) => ref.startsWith(`${baseKey}/`));
    if (held.length) {
      throw new Error(`Base ${baseKey} is still read by a live checkout (${held.join(', ')}).`);
    }
    await rm(dir, { recursive: true, force: true });
    this.logger.log(`Removed base ${baseKey}`);
  }

  async collectBaseGenerations(): Promise<{ baseKey: string; generation: string }[]> {
    const root = path.join(this.stateRoot(), '_bases');
    if (!existsSync(root)) return [];
    // Every generation a live checkout was built from: those stay, however old.
    const referenced = await this.referencedGenerations();
    const removed: { baseKey: string; generation: string }[] = [];
    for (const baseKey of await readdir(root)) {
      // A base being provisioned holds an unpublished generation that is neither current nor referenced —
      // and is bind-mounted into a running container. The live lock says so; leave the whole base alone.
      if (await this.isBaseLocked(baseKey)) {
        this.logger.log(`Base ${baseKey} is being provisioned — its generations are left alone`);
        continue;
      }
      const current = this.currentBaseGeneration(baseKey);
      for (const entry of await readdir(path.join(root, baseKey))) {
        if (!entry.startsWith('gen-') || entry === current) continue;
        if (referenced.has(`${baseKey}/${entry}`)) continue;
        await rm(path.join(root, baseKey, entry), { recursive: true, force: true });
        removed.push({ baseKey, generation: entry });
      }
    }
    if (removed.length) this.logger.log(`Collected ${removed.length} unreferenced base generation(s)`);
    return removed;
  }

  async listSharedState(): Promise<SharedStateInfo> {
    const root = path.join(this.stateRoot(), '_bases');
    const bases: BaseStateInfo[] = [];
    if (existsSync(root)) {
      const referenced = await this.referencedGenerations();
      for (const baseKey of await readdir(root)) {
        const baseDir = path.join(root, baseKey);
        if (!(await stat(baseDir)).isDirectory()) continue;
        const current = this.currentBaseGeneration(baseKey);
        const generations: BaseGenerationInfo[] = [];
        for (const entry of await readdir(baseDir)) {
          if (!entry.startsWith('gen-')) continue;
          generations.push({
            generation: entry,
            sizeBytes: await this.dirSizeBytes(path.join(baseDir, entry)),
            current: entry === current,
            referenced: referenced.has(`${baseKey}/${entry}`),
          });
        }
        bases.push({
          baseKey,
          sizeBytes: await this.dirSizeBytes(baseDir),
          locked: await this.isBaseLocked(baseKey),
          generations,
        });
      }
    }
    return {
      bases,
      seedImagesBytes: await this.dirSizeBytes(this.resolveSeedImagesDir()),
      npmCacheBytes: await this.dirSizeBytes(this.resolveNpmCacheDir()),
    };
  }

  /** `<baseKey>/<generation>` for every generation a live checkout records — the ones GC must keep. */
  private async referencedGenerations(): Promise<Set<string>> {
    const referenced = new Set<string>();
    for (const state of await this.listWorkspaceStates()) {
      for (const checkout of state.checkouts) {
        const marker = this.readCheckoutBase(state.workspaceId, checkout.workflowId);
        if (marker) referenced.add(`${marker.baseKey}/${marker.generation}`);
      }
    }
    return referenced;
  }

  private baseDir(baseKey: string): string {
    return path.join(this.stateRoot(), '_bases', baseKey);
  }

  /**
   * Claim the base for the duration of a build, exclusively and scoped to the run doing it.
   *
   * It does not protect readers — immutability does that — it only stops two runs that noticed the same
   * stale base from building the same generation twice.
   *
   * It **refuses** rather than waits, and that is the change worth knowing about. Waiting used to be the
   * kinder answer: two rounds starting together is the normal case, so the second would wait for work that
   * was about to be done for it. But waiting happened inside the transition, which held the run's task slot
   * for as long as the build took — up to 45 minutes of a slot doing nothing. Refusing hands the decision
   * back to the caller, which can say who is building and let the next cycle pick the base up once it is
   * published.
   *
   * There is nothing to break and nothing to refresh: the claim is alive exactly as long as the run holding
   * it, so a build whose process died frees its base by itself.
   */
  private async claimBase(baseKey: string, owner: BaseBuildOwner): Promise<void> {
    const result = await this.claims.claim({
      claimedByWorkflowId: owner.workflowId,
      label: `base ${baseKey}`,
      resources: [
        {
          key: baseResource(baseKey),
          mode: 'exclusive',
          scope: 'workflow',
          workspaceId: owner.workspaceId,
          scopeWorkflowId: owner.workflowId,
        },
      ],
    });
    if (!result.claimed) {
      const holder = result.blocked[0]?.holders[0];
      throw new Error(
        `Base ${baseKey} is being provisioned by another run` +
          `${holder?.scopeWorkflowId ? ` (${holder.scopeWorkflowId})` : ''} — wait for it to publish, then ` +
          'start this again. Nothing was built.',
      );
    }
    this.baseClaims.set(baseKey, result.claims[0]!.claimId);
  }

  /**
   * Release the base.
   *
   * By claim id, so it releases this build's claim and nothing else the run may hold. A release that finds
   * no id was never claimed in this process — the claim it would have released is already free, because the
   * run that held it is gone.
   */
  private async releaseBase(baseKey: string): Promise<void> {
    const claimId = this.baseClaims.get(baseKey);
    if (!claimId) return;
    this.baseClaims.delete(baseKey);
    await this.claims.release({ claimIds: [claimId] });
  }

  /** Whether a run is building this base right now. True while its claim is held by a live run. */
  private async isBaseLocked(baseKey: string): Promise<boolean> {
    const [state] = await this.claims.availability([baseResource(baseKey)]);
    return state.holders.length > 0;
  }

  async exportImageTar(image: string): Promise<void> {
    const dir = this.resolveSeedImagesDir();
    await mkdir(dir, { recursive: true });
    const tarPath = path.join(dir, `${this.imageSlug(image)}.tar`);
    const idPath = `${tarPath}.id`;
    const { Id } = await this.docker.getImage(image).inspect();
    // Digest-keyed skip: an unchanged host image keeps the existing tar, so re-provisions are cheap.
    if (existsSync(tarPath) && existsSync(idPath) && readFileSync(idPath, 'utf8').trim() === Id) {
      this.logger.log(`Seed tar for ${image} is current, skipping export`);
      return;
    }
    // Stream to a temp file and rename, so a crashed export never leaves a plausible-looking tar behind;
    // a failed export removes its temp file too (these are multi-GB — no residue on error). The `.id` is
    // written last — it's what the dind boot keys its load-skip on.
    //
    // The temp name is **unique per export**, not `<tar>.tmp`: this store is global, so two workspaces
    // provisioning dind bases at the same time export the same image concurrently. A shared temp name
    // would have them interleave into one file and rename a corrupt tar over the good one. They may still
    // both do the work — wasteful, not wrong, and the rename makes the last complete one win.
    const tmpPath = `${tarPath}.${randomUUID()}.tmp`;
    try {
      const stream = await this.docker.getImage(image).get();
      await pipeline(stream, createWriteStream(tmpPath));
      await rename(tmpPath, tarPath);
    } catch (error) {
      await rm(tmpPath, { force: true }).catch(() => undefined);
      throw error;
    }
    await writeFile(idPath, Id);
    this.logger.log(`Exported seed image ${image} (${Id.slice(0, 19)}) to ${tarPath}`);
  }

  resolveWorkflowDir(workspaceId: string, workflowId: string): string {
    return path.join(this.resolveWorkspaceDir(workspaceId), 'workflows', workflowId);
  }

  listRepos(workspaceId: string, workflowId: string): CheckoutRepo[] {
    return this.readRepos(workspaceId, workflowId);
  }

  resolveRepoDir(workspaceId: string, workflowId: string, key?: string): string {
    const repos = this.readRepos(workspaceId, workflowId);
    const repo = key ? repos.find((r) => r.key === key) : (repos.find((r) => r.primary) ?? repos[0]);
    if (!repo) {
      throw new Error(
        key
          ? `Checkout ${workflowId} has no repo "${key}".`
          : `Checkout ${workflowId} records no repos — it was not created by cloneBaseIntoWorkflow.`,
      );
    }
    const workspaceDir = this.workflowWorkspaceDir(workspaceId, workflowId);
    return repo.dir ? path.join(workspaceDir, repo.dir) : workspaceDir;
  }

  async isBaseBehindRemote(
    baseKey: string,
    dir: string,
    branch: string,
    remote: { url: string; token?: string },
  ): Promise<boolean> {
    const baseRepo = this.resolveBaseRepoDir(baseKey, dir);
    // The base is never committed on, so its HEAD is the tip it was provisioned at; the base is behind
    // exactly when the remote branch names a different commit. Asked of the remote directly (`ls-remote`)
    // rather than fetched: a fetch would write refs and packs into the published generation, which is
    // shared and immutable. A failure (offline, no access) propagates so the run fails rather than silently
    // working off a stale base.
    const head = (await this.git(['-C', baseRepo, 'rev-parse', 'HEAD'])).trim();
    const listed = await this.gitWithToken(['ls-remote', remote.url, `refs/heads/${branch}`], remote.token);
    const tip = listed.trim().split(/\s+/)[0];
    if (!tip) throw new Error(`Branch \`${branch}\` does not exist on ${remote.url}.`);
    return tip !== head;
  }

  workflowCheckoutExists(workspaceId: string, workflowId: string): boolean {
    return existsSync(this.workflowWorkspaceDir(workspaceId, workflowId));
  }

  async ensureWorkflowCheckout(
    workspaceId: string,
    workflowId: string,
    baseKey: string,
    repos: CheckoutRepo[],
  ): Promise<WorkflowCheckout> {
    if (this.workflowCheckoutExists(workspaceId, workflowId)) {
      return { workspaceDir: this.workflowWorkspaceDir(workspaceId, workflowId), created: false };
    }
    await this.cloneBaseIntoWorkflow(workspaceId, workflowId, baseKey, repos);
    await this.linkWorkflowArtifacts(workspaceId, workflowId);
    await this.checkoutWorkflowBranch(workspaceId, workflowId);
    return { workspaceDir: this.workflowWorkspaceDir(workspaceId, workflowId), created: true };
  }

  async cloneBaseIntoWorkflow(
    workspaceId: string,
    workflowId: string,
    baseKey: string,
    repos: CheckoutRepo[],
  ): Promise<void> {
    if (!this.isBaseProvisioned(baseKey)) {
      throw new Error('Base is not provisioned — run the "Provision Base" workflow for this template first.');
    }
    // Persist the repo set before cloning, so the read-side ops (link, branch, hooks, listChangedFiles,
    // the changed-files hand-off) resolve them later without the caller re-supplying them.
    await mkdir(this.resolveWorkflowDir(workspaceId, workflowId), { recursive: true });
    await this.writeRepos(workspaceId, workflowId, repos);
    // Resolve the generation **once**, here, and record it: a swap later in the run changes nothing for
    // this checkout, because every remaining stage reads the tree this one cloned from.
    const generation = this.currentBaseGeneration(baseKey)!;
    await this.writeCheckoutBase(workspaceId, workflowId, { baseKey, generation });
    const baseWorkspace = path.join(this.baseDir(baseKey), generation, 'workspace');
    // Ensure the workspace (mount) root exists so the clones can target sub-paths of it.
    await mkdir(this.workflowWorkspaceDir(workspaceId, workflowId), { recursive: true });
    // Outer-first: a nested repo's target lives inside its parent's tree, so the parent must exist first.
    for (const repo of repos) {
      const repoDir = this.resolveRepoDir(workspaceId, workflowId, repo.key);
      await this.withCheckoutCleanup(workspaceId, workflowId, () =>
        this.git(['clone', '--local', repo.dir ? path.join(baseWorkspace, repo.dir) : baseWorkspace, repoDir]),
      );
    }
  }

  async linkWorkflowArtifacts(workspaceId: string, workflowId: string): Promise<void> {
    const repos = this.readRepos(workspaceId, workflowId);
    const marker = this.readCheckoutBase(workspaceId, workflowId);
    if (!marker) {
      // Without the generation there is nothing to link from — and a checkout quietly left without its
      // node_modules would run against an unbuilt tree.
      throw new Error(
        `Checkout ${workflowId} records no base generation — it was not created by cloneBaseIntoWorkflow.`,
      );
    }
    const baseWorkspace = path.join(this.baseDir(marker.baseKey), marker.generation, 'workspace');
    for (const repo of repos) {
      // Everything cloned in stage 1 that lives *inside* this repo's tree. Each is git-ignored by its
      // parent, so the sweep below would otherwise copy the base's working state over the clean clone.
      const nested = repos
        .filter((other) => other.key !== repo.key && this.isNestedIn(other.dir, repo.dir))
        .map((other) => path.relative(repo.dir, other.dir));
      await this.withCheckoutCleanup(workspaceId, workflowId, () =>
        this.hardlinkIgnoredArtifacts(
          repo.dir ? path.join(baseWorkspace, repo.dir) : baseWorkspace,
          this.resolveRepoDir(workspaceId, workflowId, repo.key),
          nested,
        ),
      );
    }
  }

  async checkoutWorkflowBranch(workspaceId: string, workflowId: string): Promise<void> {
    // One branch name across every repo, so a run's work is trivially correlatable.
    for (const repo of this.readRepos(workspaceId, workflowId)) {
      const repoDir = this.resolveRepoDir(workspaceId, workflowId, repo.key);
      await this.withCheckoutCleanup(workspaceId, workflowId, () =>
        this.git(['-C', repoDir, 'checkout', '-b', `wf/${workflowId}`]),
      );
    }
  }

  async writeRepoGitHook(
    workspaceId: string,
    workflowId: string,
    repoKey: string,
    name: string,
    script: string,
  ): Promise<void> {
    const hooksDir = path.join(this.resolveRepoDir(workspaceId, workflowId, repoKey), '.git', 'hooks');
    await mkdir(hooksDir, { recursive: true });
    const hookPath = path.join(hooksDir, name);
    await writeFile(hookPath, script);
    await chmod(hookPath, 0o755);
  }

  async setRepoIdentity(workspaceId: string, workflowId: string, name: string, email: string): Promise<void> {
    // Every repo: a run may commit in any of them, and an unattributed commit is the kind of thing nobody
    // notices until it is on a remote.
    for (const repo of this.readRepos(workspaceId, workflowId)) {
      const repoDir = this.resolveRepoDir(workspaceId, workflowId, repo.key);
      await this.git(['-C', repoDir, 'config', 'user.name', name]);
      await this.git(['-C', repoDir, 'config', 'user.email', email]);
    }
  }

  async applyFixtures(
    workspaceId: string,
    workflowId: string,
    fixtures: { src: string; dest: string }[],
  ): Promise<void> {
    const workspaceDir = this.workflowWorkspaceDir(workspaceId, workflowId);
    for (const { src, dest } of fixtures) {
      if (!existsSync(src)) {
        this.logger.warn(`Fixture source missing, skipped: ${src}`);
        continue;
      }
      const destPath = path.join(workspaceDir, dest);
      await mkdir(path.dirname(destPath), { recursive: true });
      await copyFile(src, destPath);
    }
  }

  async listChangedFiles(workspaceId: string, workflowId: string): Promise<RepoChanges[]> {
    const changes: RepoChanges[] = [];
    for (const repo of this.readRepos(workspaceId, workflowId)) {
      const repoDir = this.resolveRepoDir(workspaceId, workflowId, repo.key);
      if (!existsSync(repoDir)) continue;
      try {
        // `--porcelain` is a stable, script-friendly format: each line is `XY <path>` (2-char status + space),
        // with renames as `old -> new`. `core.quotepath=false` keeps non-ASCII paths literal.
        const out = await this.git(['-C', repoDir, '-c', 'core.quotepath=false', 'status', '--porcelain']);
        const paths = out
          .split('\n')
          .filter((line) => line.length > 3)
          .map((line) => {
            const entry = line.slice(3);
            const arrow = entry.indexOf(' -> ');
            return arrow >= 0 ? entry.slice(arrow + 4) : entry;
          });
        if (paths.length) changes.push({ repoKey: repo.key, hostRoot: repoDir, paths });
      } catch (error) {
        this.logger.warn(
          `Failed to list changed files for ${this.describeCheckout(workspaceId, workflowId)} (${repo.key}): ` +
            this.message(error),
        );
      }
    }
    return changes;
  }

  async repoHead(workspaceId: string, workflowId: string, repoKey: string): Promise<string | undefined> {
    const repoDir = this.resolveRepoDir(workspaceId, workflowId, repoKey);
    if (!existsSync(repoDir)) return undefined;
    try {
      return (await this.git(['-C', repoDir, 'rev-parse', 'HEAD'])).trim() || undefined;
    } catch {
      // A blank repo has no HEAD to speak of.
      return undefined;
    }
  }

  async countRepoChangesSinceBase(
    workspaceId: string,
    workflowId: string,
    repoKey: string,
    baseBranch: string,
  ): Promise<RepoChangeCount> {
    const repoDir = this.resolveRepoDir(workspaceId, workflowId, repoKey);
    const none = { files: 0, insertions: 0, deletions: 0, commits: 0 };
    if (!existsSync(repoDir)) return none;
    try {
      const stat = await this.git(['-C', repoDir, 'diff', '--shortstat', `origin/${baseBranch}...HEAD`]);
      const commits = await this.git(['-C', repoDir, 'rev-list', '--count', `origin/${baseBranch}..HEAD`]);
      return { ...parseShortStat(stat), commits: Number(commits.trim()) || 0 };
    } catch {
      // No such ref — a blank repo, or a base branch that never existed here.
      return none;
    }
  }

  async diffSinceBase(
    workspaceId: string,
    workflowId: string,
    repoKey: string,
    baseBranch: string,
    maxChars: number,
  ): Promise<string> {
    const repoDir = this.resolveRepoDir(workspaceId, workflowId, repoKey);
    if (!existsSync(repoDir)) return '';
    try {
      const patch = await this.git([
        '-C',
        repoDir,
        '-c',
        'core.quotepath=false',
        'diff',
        '--no-color',
        `origin/${baseBranch}...HEAD`,
      ]);
      if (patch.length <= maxChars) return patch;
      return `${patch.slice(0, maxChars)}\n\n[… diff truncated at ${maxChars} characters — ${patch.length} in total]`;
    } catch {
      return '';
    }
  }

  async discardWorkflowCheckout(workspaceId: string, workflowId: string): Promise<void> {
    // The WHOLE workflow dir, not just its `workspace` subdir — a partial discard leaves `claude-state/`
    // and the `.repos.json` / `.base.json` markers as permanent residue. No session has run when a
    // checkout build fails (staged builds only happen on fresh checkouts), so there are never transcripts
    // to lose here.
    const workflowDir = this.resolveWorkflowDir(workspaceId, workflowId);
    this.assertInsideStateDir(workspaceId, workflowDir);
    await rm(workflowDir, { recursive: true, force: true }).catch(() => undefined);
  }

  async removeWorkflowCheckout(workspaceId: string, workflowId: string): Promise<void> {
    // Reclaim in dependency order, durable record LAST: (1) force-remove the workflow's containers, so a
    // crashed run's zombie can't hold a dind volume in-use; (2) remove the volumes; (3) only then delete
    // the checkout dir. A failure at any step leaves the checkout on disk, so the operation stays cleanly
    // re-runnable — deleting the files first would orphan whatever step 2 failed to release.
    const workflowDir = this.resolveWorkflowDir(workspaceId, workflowId);
    this.assertInsideStateDir(workspaceId, workflowDir);

    await this.removeWorkflowContainers(workspaceId, workflowId);
    await this.removeWorkflowVolumes(workspaceId, workflowId);

    // Docker Desktop maps bind-mounted files to the host user, so the checkout (incl. container-created
    // node_modules) is host-owned and can be removed directly — no throwaway container needed. Errors
    // propagate so the caller can surface them in the workflow.
    await rm(workflowDir, { recursive: true, force: true });
    this.logger.log(`Removed workflow dir ${workflowDir}`);
  }

  resolveDindVolumeName(workspaceId: string, workflowId: string, role: 'agent' | 'app'): string {
    // Full ids (not the 8-char container-name slices): the name must be collision-free per workflow —
    // two daemons sharing a data-root would corrupt it.
    return [`${this.namePrefix}-dind`, workspaceId, workflowId, role].join('-');
  }

  /**
   * Docker labels identifying which workspace and workflow a thing belongs to, built from the configured
   * namespace. They are how the provisioner finds its own containers and volumes again — including the ones
   * a crashed run left, which no row and no registry remembers — so two applications with different
   * namespaces never see each other's.
   */
  private get workspaceLabel(): string {
    return `${this.options.namespace}.workspace`;
  }

  private get workflowLabel(): string {
    return `${this.options.namespace}.workflow`;
  }

  private get runLabel(): string {
    return `${this.options.namespace}.run`;
  }

  /** The namespace as a name part: `loopstack.workspace` names a container `loopstack-workspace-…`. */
  private get namePrefix(): string {
    return this.options.namespace.replace(/\./g, '-');
  }

  async removeWorkflowContainers(workspaceId: string, workflowId: string): Promise<void> {
    await this.removeContainersByLabels([
      `${this.workspaceLabel}=${workspaceId}`,
      `${this.workflowLabel}=${workflowId}`,
    ]);
  }

  async removeWorkflowVolumes(workspaceId: string, workflowId: string): Promise<void> {
    await this.removeVolumesByLabels([`${this.workspaceLabel}=${workspaceId}`, `${this.workflowLabel}=${workflowId}`]);
  }

  // ── Inventory + workspace-level reclaim ──────────────────────────────────────────────────────────────

  async listWorkspaceStates(workspaceId?: string): Promise<WorkspaceStateInfo[]> {
    const root = this.stateRoot();
    if (!existsSync(root)) return [];
    // Scoped listing: only the one dir (the du walk over every workspace is the expensive part).
    const names =
      workspaceId !== undefined
        ? existsSync(path.join(root, workspaceId))
          ? [workspaceId]
          : []
        : (await readdir(root, { withFileTypes: true }))
            .filter((e) => e.isDirectory())
            // `_bases`, `_cache`, `_seed-images` are shared across workspaces and belong to none of them.
            // The underscore is the whole convention: a workspace id is a uuid and never starts with one.
            .filter((e) => !e.name.startsWith('_'))
            .map((e) => e.name);
    const result: WorkspaceStateInfo[] = [];
    for (const wsId of names) {
      const checkouts: CheckoutInfo[] = [];
      const workflowsRoot = path.join(root, wsId, 'workflows');
      if (existsSync(workflowsRoot)) {
        for (const wf of await readdir(workflowsRoot, { withFileTypes: true })) {
          if (!wf.isDirectory()) continue;
          const dir = path.join(workflowsRoot, wf.name);
          const stats = await stat(dir);
          checkouts.push({
            workflowId: wf.name,
            sizeBytes: await this.dirSizeBytes(dir),
            modifiedAt: stats.mtime.toISOString(),
          });
        }
      }
      result.push({
        workspaceId: wsId,
        sizeBytes: await this.dirSizeBytes(path.join(root, wsId)),
        checkouts,
      });
    }
    return result;
  }

  async listContainers(workspaceId?: string): Promise<ContainerInfo[]> {
    const label = workspaceId ? [`${this.workspaceLabel}=${workspaceId}`] : [this.workspaceLabel];
    const containers = await this.docker.listContainers({ all: true, filters: { label } });
    return containers.map((c) => ({
      id: c.Id,
      name: (c.Names?.[0] ?? '').replace(/^\//, ''),
      workspaceId: c.Labels?.[this.workspaceLabel] ?? '',
      workflowId: c.Labels?.[this.workflowLabel],
      running: c.State === 'running',
    }));
  }

  async listVolumes(workspaceId?: string): Promise<VolumeInfo[]> {
    const label = workspaceId ? [`${this.workspaceLabel}=${workspaceId}`] : [this.workspaceLabel];
    const { Volumes } = await this.docker.listVolumes({ filters: { label } });
    return (Volumes ?? []).map((v) => ({
      name: v.Name,
      workspaceId: v.Labels?.[this.workspaceLabel] ?? '',
      workflowId: v.Labels?.[this.workflowLabel],
    }));
  }

  async removeWorkspaceState(workspaceId: string): Promise<void> {
    // Same dependency order as the workflow-level reclaim, one level up: containers, volumes, files last.
    const wsDir = this.resolveWorkspaceDir(workspaceId);
    this.assertInsideStateDir(workspaceId, wsDir);
    // A base-provisioning container carries this workspace's label because the workspace started it, but
    // the base it builds is shared — killing it here would fail a build other workspaces are waiting on.
    await this.removeContainersByLabels(
      [`${this.workspaceLabel}=${workspaceId}`],
      (info) => info.Labels?.[this.workflowLabel] !== BASE_WORKFLOW_KEY,
    );
    await this.removeVolumesByLabels([`${this.workspaceLabel}=${workspaceId}`]);
    await rm(wsDir, { recursive: true, force: true });
    this.logger.log(`Removed workspace state ${wsDir}`);
  }

  // ── Internals ────────────────────────────────────────────────────────────────────────────────────────

  private async removeContainersByLabels(
    labels: string[],
    keep: (info: Docker.ContainerInfo) => boolean = () => true,
  ): Promise<void> {
    const containers = await this.docker.listContainers({ all: true, filters: { label: labels } });
    for (const info of containers) {
      if (!keep(info)) continue;
      try {
        await this.docker.getContainer(info.Id).remove({ force: true });
        this.logger.log(`Removed container ${info.Id.slice(0, 12)}`);
      } catch (error) {
        // Already gone (e.g. its owning workflow tore it down concurrently) is fine.
        if ((error as { statusCode?: number }).statusCode !== 404) throw error;
      }
    }
  }

  private async removeVolumesByLabels(labels: string[]): Promise<void> {
    const { Volumes } = await this.docker.listVolumes({ filters: { label: labels } });
    // Try every volume before failing — one stuck volume must not abort the rest of the reclaim.
    const failures: string[] = [];
    for (const volume of Volumes ?? []) {
      try {
        await this.docker.getVolume(volume.Name).remove();
        this.logger.log(`Removed volume ${volume.Name}`);
      } catch (error) {
        // Already gone is fine; anything else (e.g. still in use) is collected and thrown as one error.
        if ((error as { statusCode?: number }).statusCode === 404) continue;
        failures.push(`${volume.Name}: ${this.message(error)}`);
      }
    }
    if (failures.length) throw new Error(`Failed to remove volume(s) — ${failures.join('; ')}`);
  }

  /** Disk usage of a directory via `du -sk` (KB → bytes); 0 when unreadable. */
  private async dirSizeBytes(dir: string): Promise<number> {
    try {
      const { stdout } = await run('du', ['-sk', dir]);
      return Number(stdout.trim().split(/\s+/)[0]) * 1024;
    } catch {
      return 0;
    }
  }

  /** Security guard for destructive paths: only ever delete inside this workspace's state dir. */
  private assertInsideStateDir(workspaceId: string, target: string): void {
    const stateRoot = path.resolve(this.resolveWorkspaceDir(workspaceId));
    if (path.resolve(target) !== stateRoot && !path.resolve(target).startsWith(stateRoot + path.sep)) {
      throw new Error(`Refusing to remove ${target}: outside the workspace state dir.`);
    }
  }

  /**
   * Create a named volume with the workspace/workflow labels unless it already exists. Inspect-first
   * (rather than create-and-tolerate) because `createVolume` on an existing name silently ignores the
   * labels — and the labels are what {@link removeWorkflowVolumes} sweeps by.
   */
  private async ensureVolume(name: string, workspaceId?: string, workflowId?: string): Promise<void> {
    try {
      await this.docker.getVolume(name).inspect();
    } catch {
      await this.docker.createVolume({
        Name: name,
        Labels: {
          ...(workspaceId ? { [this.workspaceLabel]: workspaceId } : {}),
          ...(workflowId ? { [this.workflowLabel]: workflowId } : {}),
        },
      });
      this.logger.log(`Created volume ${name}`);
    }
  }

  /** Absolute host root for a workspace's state (`<stateDir>/<workspaceId>`). */
  private resolveWorkspaceDir(workspaceId: string): string {
    return path.join(this.stateRoot(), workspaceId);
  }

  /** The configured state dir as an absolute path (its entries are workspace ids). */
  private stateRoot(): string {
    const { stateDir } = this.options;
    if (!stateDir) {
      throw new Error(
        'A stateDir is required — configure it in CodeWorkspaceModule.forRoot (e.g. from LOOPSTACK_ENGINEER_STATE_DIR).',
      );
    }
    // Expand a leading `~/` (dotenv doesn't) so `~/.loopstack-engineer` works, not just absolute paths.
    return stateDir.startsWith('~/') ? path.join(os.homedir(), stateDir.slice(2)) : path.resolve(stateDir);
  }

  private workflowWorkspaceDir(workspaceId: string, workflowId: string): string {
    return path.join(this.resolveWorkflowDir(workspaceId, workflowId), 'workspace');
  }

  /** Which base generation this checkout was cloned from — its reference for GC, and its stable view. */
  private checkoutBaseMarker(workspaceId: string, workflowId: string): string {
    return path.join(this.resolveWorkflowDir(workspaceId, workflowId), '.base.json');
  }

  private async writeCheckoutBase(
    workspaceId: string,
    workflowId: string,
    marker: { baseKey: string; generation: string },
  ): Promise<void> {
    await writeFile(this.checkoutBaseMarker(workspaceId, workflowId), JSON.stringify(marker, null, 2));
  }

  private readCheckoutBase(
    workspaceId: string,
    workflowId: string,
  ): { baseKey: string; generation: string } | undefined {
    const marker = this.checkoutBaseMarker(workspaceId, workflowId);
    if (!existsSync(marker)) return undefined;
    try {
      return JSON.parse(readFileSync(marker, 'utf8')) as { baseKey: string; generation: string };
    } catch {
      return undefined;
    }
  }

  /**
   * Marker file (sibling of `workspace`, so it's outside the mount) recording the repos this checkout was
   * created with. Written before the first clone, so every later read-side operation — resolve, branch,
   * hooks, changed files — works from what the checkout actually holds rather than from a caller's
   * argument that may no longer match.
   */
  private reposMarker(workspaceId: string, workflowId: string): string {
    return path.join(this.resolveWorkflowDir(workspaceId, workflowId), '.repos.json');
  }

  private async writeRepos(workspaceId: string, workflowId: string, repos: CheckoutRepo[]): Promise<void> {
    await writeFile(this.reposMarker(workspaceId, workflowId), JSON.stringify(repos, null, 2));
  }

  /** The persisted repo set; empty when the marker is missing or unreadable. */
  private readRepos(workspaceId: string, workflowId: string): CheckoutRepo[] {
    const marker = this.reposMarker(workspaceId, workflowId);
    if (!existsSync(marker)) return [];
    try {
      const parsed: unknown = JSON.parse(readFileSync(marker, 'utf8'));
      return Array.isArray(parsed) ? (parsed as CheckoutRepo[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Run a checkout step, discarding the half-built workspace on failure — otherwise a retry sees the dir,
   * treats it as ready, and reuses a broken checkout. Keeps each stage independently retryable.
   */
  private async withCheckoutCleanup(
    workspaceId: string,
    workflowId: string,
    step: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await step();
    } catch (error) {
      await this.discardWorkflowCheckout(workspaceId, workflowId);
      throw error;
    }
  }

  /** True when `inner` lies strictly inside `outer` (both workspace-root-relative repo dirs). */
  private isNestedIn(inner: string, outer: string): boolean {
    if (!inner || inner === outer) return false;
    return outer === '' || inner.startsWith(`${outer}/`);
  }

  /** A checkout named for a log line. Not a Docker label — those are {@link workspaceLabel} and friends. */
  private describeCheckout(workspaceId: string, workflowId: string): string {
    return `${workspaceId}--${workflowId}`;
  }

  /** Run a git command; throws with stderr on failure. */
  private async git(args: string[]): Promise<string> {
    const { stdout } = await run('git', args, { maxBuffer: 32 * 1024 * 1024 });
    return stdout;
  }

  /**
   * Run a git command against a remote that may need a token. The token goes through a throwaway
   * `GIT_ASKPASS` script that exists only for the command's duration — never in the URL, argv or config,
   * the same arrangement the session server uses.
   */
  private async gitWithToken(args: string[], token?: string): Promise<string> {
    if (!token) return this.git(args);
    const askPass = path.join(os.tmpdir(), `git-askpass-${randomUUID()}.sh`);
    await writeFile(askPass, `#!/bin/sh\necho "$LOOPSTACK_GIT_TOKEN"\n`, { mode: 0o700 });
    try {
      const { stdout } = await run('git', args, {
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, GIT_ASKPASS: askPass, GIT_TERMINAL_PROMPT: '0', LOOPSTACK_GIT_TOKEN: token },
      });
      return stdout;
    } finally {
      try {
        unlinkSync(askPass);
      } catch {
        // Already gone.
      }
    }
  }

  /**
   * Copy a tree for a **generation**: clonefile where available, else a plain copy. Not hardlinks — a
   * generation is built in, and a build rewrites files in place.
   */
  private async cloneOrCopy(src: string, dest: string): Promise<void> {
    if (this.cloneSupported !== false) {
      try {
        await run('cp', ['-cR', src, dest]);
        this.cloneSupported = true;
        return;
      } catch (error) {
        if (this.cloneSupported) throw error;
        this.cloneSupported = false;
      }
    }
    await run('cp', ['-R', src, dest]);
  }

  /**
   * Copy every path git ignores in the base (node_modules, dist, .turbo, …) into the fresh checkout, at the
   * same relative path, without duplicating file data. Prefers APFS clonefile (copy-on-write) and falls back
   * to hardlinks — see {@link cloneOrLink}. For a ~1 GB monorepo `node_modules` the clone path is near-instant
   * where the plain hardlink walk took tens of seconds, and each checkout is fully isolated (a write there
   * never touches the base).
   *
   * `ls-files --directory` can list a collapsed dir (`.husky/_/`) *and* the ignored files inside it, so
   * entries are sorted (parents first) and any whose destination already exists — created when its parent
   * dir was copied — is skipped. That also makes a re-run over a partial checkout idempotent.
   */
  private async hardlinkIgnoredArtifacts(
    baseRepo: string,
    workspaceDir: string,
    exclude: string[] = [],
  ): Promise<void> {
    const listing = await this.git([
      '-C',
      baseRepo,
      'ls-files',
      '--others',
      '--ignored',
      '--exclude-standard',
      '--directory',
    ]);
    const entries = listing
      .split('\n')
      .map((line) => line.trim().replace(/\/+$/, ''))
      .filter(Boolean)
      .sort();
    for (const rel of entries) {
      // A nested repo of this checkout is git-ignored here, so the sweep would copy the base's working
      // state over the clean clone stage 1 already made. Its own sweep handles its artifacts.
      if (exclude.some((skip) => rel === skip || rel.startsWith(`${skip}/`) || skip.startsWith(`${rel}/`))) continue;
      const src = path.join(baseRepo, rel);
      const dest = path.join(workspaceDir, rel);
      // Skip if already hardlinked in (a parent dir entry copied it) or missing from the base.
      if (existsSync(dest) || !existsSync(src)) continue;
      await mkdir(path.dirname(dest), { recursive: true });
      await this.cloneOrLink(src, dest);
    }
  }

  /**
   * Copy a tree share-efficiently: APFS clonefile (`cp -cR`, copy-on-write) when available, else hardlinks
   * (`cp -al`). clonefile is dramatically faster for large trees and gives true isolation (writes are
   * copy-on-write, so they never touch the base); hardlinks are the portable fallback (npm/git unlink-and-
   * rewrite, so they stay safe too). Support is probed once and cached — on non-APFS (e.g. Linux) `-c` isn't
   * a valid flag, so the first attempt fails immediately and every subsequent copy uses hardlinks.
   */
  private cloneSupported: boolean | undefined;

  private async cloneOrLink(src: string, dest: string): Promise<void> {
    if (this.cloneSupported !== false) {
      try {
        await run('cp', ['-cR', src, dest]);
        this.cloneSupported = true;
        return;
      } catch (error) {
        // If clonefile worked before, a failure now is a real error, not an unsupported platform.
        if (this.cloneSupported) throw error;
        this.cloneSupported = false;
      }
    }
    await run('cp', ['-al', src, dest]);
  }

  /**
   * Docker populates `NetworkSettings.Ports` asynchronously — right after `start()` the binding is an
   * empty array and only fills in a few hundred ms later. Poll the inspect until the host port appears,
   * failing fast (with a real reason) if the container exits in the meantime.
   */
  private async resolveHostPort(
    container: Docker.Container,
    port: number,
    attempts = 50,
    delayMs = 100,
  ): Promise<string> {
    for (let i = 0; i < attempts; i++) {
      const info = await container.inspect();
      if (!info.State?.Running) {
        throw new Error(`Container exited before publishing port ${port} (status: ${info.State?.Status})`);
      }
      const hostPort = info.NetworkSettings.Ports?.[`${port}/tcp`]?.[0]?.HostPort;
      if (hostPort) return hostPort;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error(`Container did not publish a host port for ${port} in time`);
  }

  private async waitForHealth(agentUrl: string, attempts = 60, delayMs = 1000): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(`${agentUrl}/health`);
        if (response.ok) return;
      } catch {
        /* not ready yet */
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error(`Agent at ${agentUrl} did not become healthy in time`);
  }

  /**
   * Filename slug for an image reference (`repo/name:tag` → `repo-name-tag`) — the ONE place a key is
   * mangled. Workspace/workflow ids are never transformed (see the class doc): the image reference is the
   * only externally-shaped key, and its `:`/`/` aren't filesystem-safe.
   */
  private imageSlug(image: string): string {
    const slug = image
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64)
      .replace(/-+$/g, '');
    if (!slug) throw new Error(`Invalid image reference "${image}" — must contain alphanumeric characters.`);
    return slug;
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
