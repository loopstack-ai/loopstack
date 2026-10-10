/**
 * The `code-workspace` provider port: base provisioning, per-workflow hardlinked checkouts, and the
 * disposable-container lifecycle that runs them. Domain-neutral — it knows nothing about Claude, the
 * app-runner, or any specific agent. A local-Docker implementation ({@link LocalDockerProvisioner}) backs
 * it today; a remote implementation could swap in behind the same interface (bind a different class to
 * {@link CODE_WORKSPACE_PROVISIONER}) without touching consumers.
 */
import type { RepoChangeCount } from './short-stat.js';

/** DI token for the {@link CodeWorkspaceProvisioner} implementation. */
export const CODE_WORKSPACE_PROVISIONER = Symbol('CODE_WORKSPACE_PROVISIONER');

export interface ProvisionOptions {
  /** The container image to run — the caller chooses it (session, app-runner, attach, …). */
  image: string;
  /** Host directory bind-mounted at `/workspace` (created if missing). Omit for an ephemeral run. */
  mountDir?: string;
  /** Workspace the container belongs to — stamped as a label and into the name so it's identifiable. */
  workspaceId?: string;
  /** Workflow (or `base`) the container belongs to — stamped as a label and into the name. */
  workflowId?: string;
  /** Extra environment variables for the container (e.g. auth tokens). */
  env?: Record<string, string>;
  /** Boot Postgres/Redis in the container and inject `DATABASE_URL` / `REDIS_URL`. */
  services?: ('postgres' | 'redis')[];
  /** Publish these in-container ports to the host, in addition to the agent port. */
  extraPorts?: number[];
  /** Extra `host:container` bind mounts; each host dir is created if missing. */
  extraBinds?: string[];
  /**
   * Run the container privileged — required for the dind images, whose inner Docker daemon needs full
   * device/cgroup access. Set only by the self-engineering flows; everything else stays unprivileged.
   */
  privileged?: boolean;
  /**
   * Named volumes to mount (created with the workspace/workflow labels if missing). Distinct from
   * `extraBinds`, whose host-path half is `mkdir`ed — a volume name must be passed to Docker verbatim.
   * Used for the inner daemon's `/var/lib/docker`: it must live on a real Linux fs (not a macOS bind)
   * and persists the inner image store/build cache across re-provisions of the same workflow.
   */
  namedVolumes?: { name: string; containerPath: string }[];
}

export interface ProvisionedContainer {
  containerId: string;
  agentUrl: string;
  /** Host URLs of published `extraPorts`, keyed by the in-container port. */
  portUrls?: Record<number, string>;
}

/** A repo as a checkout records it: enough to resolve, branch and report on it later. */
export interface CheckoutRepo {
  key: string;
  dir: string;
  /** Absent for a blank repo that was initialised rather than cloned. */
  url?: string;
  branch?: string;
  primary?: boolean;
}

/** The changed files of one repo in a checkout. */
export interface RepoChanges {
  repoKey: string;
  /** Absolute host path of that repo's root — what a per-file "open in the IDE" action joins against. */
  hostRoot: string;
  /** Repo-relative paths that changed. */
  paths: string[];
}

/** Outcome of materializing a workflow's isolated checkout from the workspace base. */
export interface WorkflowCheckout {
  /** Host dir mounted at `/workspace` for this workflow's containers. */
  workspaceDir: string;
  /** True when this call created the checkout; false when a prior run's checkout was reused. */
  created: boolean;
}

/** One workspace's on-disk state, as inventoried for cleanup/reporting. */
export interface WorkspaceStateInfo {
  workspaceId: string;
  /** Total disk usage of `<stateDir>/<workspaceId>` — its checkouts, which is all a workspace owns. */
  sizeBytes: number;
  checkouts: CheckoutInfo[];
}

/** One workflow checkout on disk. */
export interface CheckoutInfo {
  workflowId: string;
  sizeBytes: number;
  /** Filesystem mtime of the checkout dir (ISO) — a rough "last used". */
  modifiedAt: string;
}

/** One generation of a shared base, as inventoried for cleanup/reporting. */
export interface BaseGenerationInfo {
  generation: string;
  sizeBytes: number;
  /** `current` points at it — what new checkouts clone from. */
  current: boolean;
  /** A live checkout was cloned from it and still records it. */
  referenced: boolean;
}

/**
 * The run a base build belongs to.
 *
 * A build's exclusive hold on its base lives exactly as long as this run: nothing to refresh while it works,
 * and nothing to break when it dies.
 */
export interface BaseBuildOwner {
  workflowId: string;
  workspaceId: string;
}

/** One shared base on disk. */
export interface BaseStateInfo {
  baseKey: string;
  /** Total disk usage of `<stateDir>/_bases/<key>` — every generation. */
  sizeBytes: number;
  /** A run holds this base right now — its unpublished generation is being built. */
  locked: boolean;
  generations: BaseGenerationInfo[];
}

/** The state shared by every workspace: bases, seed tars and the npm cache — the largest things on disk. */
export interface SharedStateInfo {
  bases: BaseStateInfo[];
  seedImagesBytes: number;
  npmCacheBytes: number;
}

/** A container this module created, as inventoried from the Docker daemon. */
export interface ContainerInfo {
  id: string;
  name: string;
  workspaceId: string;
  /** Absent on containers provisioned without a workflow; `'base'` for base-provisioning containers. */
  workflowId?: string;
  running: boolean;
}

/** A named volume this module created (a dind inner-daemon cache). */
export interface VolumeInfo {
  name: string;
  workspaceId: string;
  workflowId?: string;
}

/**
 * Manages the on-disk state that outlives containers plus the container lifecycle itself. On-disk layout
 * under `<stateDir>/`:
 *
 * - `_bases/<key>/gen-*` + `current` — shared, immutable, generational bases keyed by the hash of their
 *   provision config (repos, setup commands, seed images). `current` points at the generation checkouts
 *   are cloned from; superseded generations stay until GC.
 * - `<workspaceId>/workflows/<workflowId>/workspace` — one isolated clone of a base per workflow instance,
 *   plus sibling marker files and a `<workflowId>/…` state dir the caller mounts. Checkouts are all a
 *   workspace owns.
 * - `_seed-images` — global, digest-keyed `<slug>.tar` exports of host images, loaded into the dind
 *   containers' inner daemons at boot.
 * - `_cache/npm` — one global npm cache shared by every base build and lockfile regeneration.
 *
 * Checkouts are cheap (git object store + build artifacts are cloned copy-on-write or hardlinked from the
 * base) and safe (git/npm unlink-and-rewrite, so a workflow never mutates the shared base), so many
 * workflows across many workspaces run in parallel off one provisioned base.
 */
export interface CodeWorkspaceProvisioner {
  /** Provision a disposable container, mounting `mountDir` at `/workspace` (+ any `extraBinds`). */
  provision(opts: ProvisionOptions): Promise<ProvisionedContainer>;
  /** Force-remove a container (no `--rm`, so a crashed container's logs survive until this is called). Throws on failure so callers can surface it. */
  teardown(containerId: string): Promise<void>;

  // ── Bases: shared, immutable, generational ─────────────────────────────────────────────────────────
  //
  // A base belongs to a **provision config**, not to a workspace. Several workspaces of the same app —
  // the normal way to run areas in parallel — would otherwise each hold a byte-identical clone, install
  // and build, and each pay the fetch and rebuild again when the branch moves. Keyed by config, they
  // share one.
  //
  // Sharing makes concurrency real: a refresh writes what a checkout is reading, and the damaging case is
  // silent — the artifact copy reading `node_modules` while `npm install` rewrites it yields a checkout
  // holding a mix of old and new packages, with no error and a failure much later. So a published
  // generation is **never mutated**. A refresh copies it, updates the copy, and swaps a `current` pointer
  // atomically; readers resolve `current` once and keep the generation they resolved.

  /**
   * Absolute host path of a base's **workspace tree** — the directory mounted at `/workspace`, holding one
   * directory per declared repo. Resolves through `current`, so it names the generation live *now*.
   */
  resolveBaseWorkspaceDir(baseKey: string): string;
  /** Absolute host path of one repo inside a base tree (`<base workspace>/<dir>`). */
  resolveBaseRepoDir(baseKey: string, dir: string): string;
  /**
   * Absolute host path of the **global** npm cache (`<stateDir>/_cache/npm`). Bind-mounted into the
   * provision container so the download cache survives teardown, and shared across bases because a cache
   * of tarballs is the same cache whoever fetched it.
   */
  resolveNpmCacheDir(): string;
  /** True when this base has a published generation. */
  isBaseProvisioned(baseKey: string): boolean;
  /**
   * True when the base copy of the repo at `dir` is behind its remote tip — i.e. `<branch>` has advanced
   * since the base was last provisioned, so a re-provision is needed. Read-only on both sides: the remote
   * is asked with `ls-remote` (a token, when the repo needs one, goes through a throwaway `GIT_ASKPASS`)
   * and compared against the base's `HEAD` — nothing is written into the published generation. Throws if
   * the remote is unreachable. A base is never committed on, so it can only be behind or equal. A base
   * with several repos is stale when **any** of them is behind.
   */
  isBaseBehindRemote(
    baseKey: string,
    dir: string,
    branch: string,
    remote: { url: string; token?: string },
  ): Promise<boolean>;

  /**
   * Start a new generation: a copy-on-write copy of `current` (or an empty tree for a first provision),
   * which the caller then clones/refreshes and builds in. Nothing reading the base sees it until it is
   * published. Returns the generation id and the workspace tree to mount.
   *
   * Claims the base for the duration, exclusively and scoped to `owner.workflowId`, so two runs noticing the
   * same stale base do not build the same generation twice. It **refuses** rather than waits: a caller that
   * cannot claim it is told another provision is
   * in flight.
   */
  beginBaseGeneration(
    baseKey: string,
    meta: unknown,
    owner: BaseBuildOwner,
  ): Promise<{ generation: string; workspaceDir: string }>;
  /** Publish a generation as `current` — an atomic pointer swap — and release the lock. */
  publishBaseGeneration(baseKey: string, generation: string): Promise<void>;
  /** Drop an unpublished generation (a failed provision) and release the lock. */
  discardBaseGeneration(baseKey: string, generation: string): Promise<void>;
  /** The generation `current` points at, or undefined when the base has none. */
  currentBaseGeneration(baseKey: string): string | undefined;
  /**
   * Remove every generation of every base that is neither `current` nor referenced by a live checkout.
   * A base whose provisioning lock is live is skipped whole: its unpublished generation is neither, and it
   * is mounted into a running container. Returns what it removed. Safe for checkouts built from a removed
   * generation: `git clone --local` hardlinks the object store and the artifact copy is a clonefile or a
   * hardlink, so nothing a checkout already holds can be pulled out from under it.
   */
  collectBaseGenerations(): Promise<{ baseKey: string; generation: string }[]>;

  /**
   * Remove a whole base — every generation and the `current` pointer.
   *
   * For a base nothing provisions any more: generation collection keeps each base's published generation
   * forever, so a base whose key no longer matches any template is never reclaimed by it. Refuses while the
   * base is being provisioned, and while any live checkout's recorded generation belongs to it — the caller
   * knows which keys are still declared, this knows what is still reading them.
   */
  removeBase(baseKey: string): Promise<void>;

  /**
   * Absolute host path of the **global** seed-image dir (`<stateDir>/_seed-images`) — `<slug>.tar` exports
   * written by {@link exportImageTar}, bind-mounted read-only at `/opt/loopstack/seed-images` into dind
   * containers, whose boot loads them into the inner daemon. Global because the exports are digest-keyed
   * copies of host images: identical for every workspace, and multi-GB each.
   */
  resolveSeedImagesDir(): string;
  /**
   * Export a host image into the global seed-image dir as `<slug>.tar` plus a sibling
   * `<slug>.tar.id` carrying the image Id. Digest-keyed: when the stored Id matches the host image's
   * current Id the (multi-GB) export is skipped, so asking before every dind container costs an inspect; a
   * refreshed host image re-exports. Strictly host → sandbox by copy — nothing an inner daemon does can
   * flow back.
   */
  exportImageTar(image: string): Promise<void>;
  /**
   * Deterministic name of a workflow's inner-daemon volume — one per container role, because a Docker
   * daemon requires exclusive access to its data-root and the session (`agent`) and manual-test (`app`)
   * containers can run concurrently.
   */
  resolveDindVolumeName(workspaceId: string, workflowId: string, role: 'agent' | 'app'): string;
  /**
   * Force-remove all containers labeled with this workflow (e.g. a crashed run's zombie session
   * container). Tolerates already-gone containers. Runs first in {@link removeWorkflowCheckout} so a
   * leftover container can never hold a dind volume hostage (409 in-use).
   */
  removeWorkflowContainers(workspaceId: string, workflowId: string): Promise<void>;
  /**
   * Remove all named volumes labeled with this workflow (the inner-daemon caches). Tolerates missing
   * volumes; other failures are collected across all volumes and thrown as one aggregate error, so a
   * single stuck volume doesn't abort the rest.
   */
  removeWorkflowVolumes(workspaceId: string, workflowId: string): Promise<void>;

  /** Absolute host path of a workflow's checkout dir (`<stateDir>/<workspaceId>/workflows/<workflowId>`). */
  resolveWorkflowDir(workspaceId: string, workflowId: string): string;
  /**
   * The repos this checkout was created with, as persisted at creation — so every read-side operation
   * resolves them without the caller supplying them again.
   */
  listRepos(workspaceId: string, workflowId: string): CheckoutRepo[];
  /**
   * Absolute host path of one repo within a workflow's checkout (`<workspace>/<dir>`). Repos are cloned
   * into sub-paths of the mounted workspace, so fixtures can sit at the workspace root outside all of
   * them. `key` omitted resolves the **primary** repo, which is what single-repo callers want.
   */
  resolveRepoDir(workspaceId: string, workflowId: string, key?: string): string;
  /** True when this workflow already has a materialized checkout (a prior run of the same workflow). */
  workflowCheckoutExists(workspaceId: string, workflowId: string): boolean;
  /** Materialize (or reuse) a workflow's isolated checkout from the base — clone + link artifacts + branch. */
  ensureWorkflowCheckout(
    workspaceId: string,
    workflowId: string,
    baseKey: string,
    repos: CheckoutRepo[],
  ): Promise<WorkflowCheckout>;
  /**
   * Stage 1 — clone each base repo into `<workspace>/<dir>`, outer-first, and persist the repo set plus
   * the **generation** it was cloned from. Recording the generation is what makes a mid-run swap harmless:
   * every later stage reads the same tree this one did.
   */
  cloneBaseIntoWorkflow(workspaceId: string, workflowId: string, baseKey: string, repos: CheckoutRepo[]): Promise<void>;
  /**
   * Stage 2 — hardlink each base repo's git-ignored build artifacts (node_modules, dist, …) into the
   * checkout. A repo nested inside another is **skipped** by its parent's sweep: it is git-ignored there,
   * so the sweep would otherwise drag it in as a copy of the base's working state instead of the clean
   * clone stage 1 made of it.
   */
  linkWorkflowArtifacts(workspaceId: string, workflowId: string): Promise<void>;
  /** Stage 3 — check out the per-workflow `wf/<workflowId>` branch in **every** repo, under one name. */
  checkoutWorkflowBranch(workspaceId: string, workflowId: string): Promise<void>;
  /**
   * Write an executable git hook (e.g. `pre-commit`) into the workflow's checkout repo (`.git/hooks/<name>`).
   * Lives inside `.git`, so it is never tracked/committed and does not conflict with the repo's own hooks
   * (a `git clone --local` checkout doesn't inherit `core.hooksPath`). Use to enforce a commit policy that
   * fails loudly inside the agent's container. Overwrites any existing hook of that name.
   */
  writeRepoGitHook(
    workspaceId: string,
    workflowId: string,
    repoKey: string,
    name: string,
    script: string,
  ): Promise<void>;
  /**
   * Set the git author identity on the workflow's checkout (`.git/config`), so every commit made in it is
   * attributed correctly whatever the agent does. Repo-local, which beats any global the image carries —
   * and the host knows the identity, so it is not something to ask an agent to configure.
   */
  setRepoIdentity(workspaceId: string, workflowId: string, name: string, email: string): Promise<void>;
  /**
   * Copy fixture files into the workspace root (outside the repo, so they never touch the repo's git) —
   * e.g. a `CLAUDE.md` of the coding rules. Idempotent: overwrites each run so a fixture update propagates.
   */
  applyFixtures(workspaceId: string, workflowId: string, fixtures: { src: string; dest: string }[]): Promise<void>;
  /**
   * What changed in each repo of a workflow's checkout (working tree, incl. untracked). One entry per repo
   * that has changes — each carrying its own host root, because a review tree (and a per-repo diff) is
   * rooted at the repo, not at the workspace.
   */
  listChangedFiles(workspaceId: string, workflowId: string): Promise<RepoChanges[]>;
  /**
   * The commit one repo of a checkout is at — what a run read, recorded so a later run can ask what moved
   * since (`git log <sha>..HEAD`). Undefined for a blank repo with no commits.
   */
  repoHead(workspaceId: string, workflowId: string, repoKey: string): Promise<string | undefined>;
  /**
   * The numbers a run's commits changed in one repo against the branch it was cut from: files, lines added
   * and removed, commits. The host's own measure of a round, beside whatever the agent says about it. All
   * zero when the ref is unknown (a blank repo).
   */
  countRepoChangesSinceBase(
    workspaceId: string,
    workflowId: string,
    repoKey: string,
    baseBranch: string,
  ): Promise<RepoChangeCount>;
  /**
   * The committed diff of one repo against the branch it was cut from, as `git diff` prints it, cut at
   * `maxChars` with a note saying so. Empty when the ref is unknown or nothing changed.
   */
  diffSinceBase(
    workspaceId: string,
    workflowId: string,
    repoKey: string,
    baseBranch: string,
    maxChars: number,
  ): Promise<string>;
  /** Discard a (possibly partial) checkout — the whole workflow dir, host-side only, base untouched. */
  discardWorkflowCheckout(workspaceId: string, workflowId: string): Promise<void>;
  /**
   * Reclaim everything a workflow owns, in dependency order: labeled containers (force), then dind
   * volumes, then the checkout directory. The directory — the durable record — goes last, so any failure
   * leaves the operation cleanly re-runnable. Throws on failure. Idempotent: a missing checkout dir (e.g.
   * docker leftovers whose files are already gone) is fine.
   */
  removeWorkflowCheckout(workspaceId: string, workflowId: string): Promise<void>;

  // ── Inventory + workspace-level reclaim (the cleanup/maintenance surface) ───────────────────────────

  /** Workspace state dirs on disk, with sizes and checkouts — all of them, or just `workspaceId`. Read-only. */
  listWorkspaceStates(workspaceId?: string): Promise<WorkspaceStateInfo[]>;
  /** The shared state — every base with its generations, the seed tars, the npm cache — with sizes. Read-only. */
  listSharedState(): Promise<SharedStateInfo>;
  /** Containers this module created (running or not) — all, or just `workspaceId`'s. Read-only. */
  listContainers(workspaceId?: string): Promise<ContainerInfo[]>;
  /** Named volumes this module created (dind caches) — all, or just `workspaceId`'s. Read-only. */
  listVolumes(workspaceId?: string): Promise<VolumeInfo[]>;
  /**
   * Reclaim everything a workspace owns — all its labeled containers (force), all its volumes, then the
   * whole `<stateDir>/<workspaceId>` dir (every checkout — the only disk state a workspace owns) last.
   * Shared bases, seed tars and the npm cache belong to no workspace and are untouched. Same ordering
   * contract and idempotence as {@link removeWorkflowCheckout}, one level up. The workspace's DB rows are
   * NOT touched — this is the disk/docker half, used after (or independent of) a Studio workspace deletion.
   */
  removeWorkspaceState(workspaceId: string): Promise<void>;
}
