# @loopstack/code-workspace

## 0.2.0

### Minor Changes

- [#439](https://github.com/loopstack-ai/loopstack/pull/439) [`697b185`](https://github.com/loopstack-ai/loopstack/commit/697b1850de1438c4f46dc0ccba6af9b0b6765db2) Thanks [@jakobklippel](https://github.com/jakobklippel)! - A workspace has one checkout, created by the first run that needs it and used as it is by every later run in that
  workspace. Containers and dind volumes belong to the run that started them.
  - `CodeWorkspaceProvisioner` addresses a checkout by `workspaceId` alone: `ensureCheckout`, `checkoutExists`,
    `resolveCheckoutDir`, `cloneBase`, `linkArtifacts`, `listRepos`, `resolveRepoDir`, `writeRepoGitHook`,
    `setRepoIdentity`, `applyFixtures`, `listChangedFiles`, `repoHead`, `countRepoChangesSinceBase` and `diffSinceBase`
    take no `workflowId`. `ensureCheckout` returns a `Checkout`; no per-run branch is checked out.
  - `WorkspaceStateInfo.checkout` is the workspace's one `CheckoutInfo`, when it has one.
  - Reclamation: the cleanup listener acts on `workspace.deleted` only; a run owns no files. `removeWorkflowContainers`
    and `removeWorkflowVolumes` release a run's containers and volumes, and the orphan plan lists containers and volumes
    of deleted runs beside workspace state whose row is gone.

### Patch Changes

- [#439](https://github.com/loopstack-ai/loopstack/pull/439) [`30213dc`](https://github.com/loopstack-ai/loopstack/commit/30213dc3b1502c7e30bab5511f60d31529b882da) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Collecting superseded base generations reads only the checkout markers instead of measuring every checkout, so a base build no longer spends minutes on directory sizes after it publishes.

- [#439](https://github.com/loopstack-ai/loopstack/pull/439) [`b3c60fa`](https://github.com/loopstack-ai/loopstack/commit/b3c60fa3bb1668cf0ae73cced03ae3cbc8e2877e) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Deleting workspaces no longer stalls the application. `removeWorkspaceState` removes the state directory with
  an `rm` child process instead of Node's recursive `fs.rm`, so a checkout's `node_modules` walk runs outside
  the process threadpool. `WorkspaceCleanupListener` chains the removals of a batch delete so they run one at a
  time. The path guard checks against the state root itself and refuses an empty id or one that climbs out.
- Updated dependencies [[`0389ffd`](https://github.com/loopstack-ai/loopstack/commit/0389ffd06c1a0321118f5e42bf236832c0beaf19), [`697b185`](https://github.com/loopstack-ai/loopstack/commit/697b1850de1438c4f46dc0ccba6af9b0b6765db2)]:
  - @loopstack/common@0.46.0
  - @loopstack/hitl@0.6.5
  - @loopstack/claims@0.1.1

## 0.1.0

### Minor Changes

- [#435](https://github.com/loopstack-ai/loopstack/pull/435) [`bd73f99`](https://github.com/loopstack-ai/loopstack/commit/bd73f991b24380338cb860555ce15df898ad3883) Thanks [@jakobklippel](https://github.com/jakobklippel)! - New registry package: isolated per-run checkouts, and their whole life.

  Clones a codebase from a shared, generational base into one checkout per run, works it in disposable Docker
  containers, and reclaims all of it again. Domain-neutral: it knows about repos, checkouts, containers and
  volumes, and nothing about what you do in them.
  - `CodeWorkspaceModule.forRoot({ stateDir, namespace })` binds `LocalDockerProvisioner` to the
    `CODE_WORKSPACE_PROVISIONER` token, so another implementation can take its place without touching
    consumers. **`namespace`** is how the module finds its own things again — every container and volume is
    labelled and named from it, and every sweep filters on exactly those — so two applications with different
    namespaces never see or remove each other's. Default `loopstack.workspace`.
  - Bases are shared, immutable and generational, keyed by the hash of their provision config. A published
    generation is never mutated: a refresh copies it and swaps a `current` pointer, so a checkout keeps the
    generation it resolved. Checkouts are cheap (copy-on-write or hardlinked build output) and cannot mutate
    the base.
  - Reclamation three ways: a listener on `workspace.deleted` and `workflow.deleted` that releases a
    workspace's or a run's containers, volumes and files by itself; `WorkspaceInventoryService` for what exists
    and what has no owner left, joined against the workflow and workspace tables; and the direct removals, all
    idempotent and all in dependency order — containers, volumes, then files — so a failure stays re-runnable.
  - `CodeWorkspaceMaintenanceModule` is a separate import: a `@StudioApp` offering a read-only **State Report**
    — every workspace with its sizes, checkouts, containers and volumes, orphans flagged, and the only view
    that shows state which is not an orphan — and a confirm-gated sweep for the state nothing owns — what a failed background removal, or a process that died mid-removal, leaves behind,
    plus bases no configuration declares. It proposes a base only when the application declared its
    `knownBaseKeys`; without them it proposes none, because reading "none declared" as "none wanted" would
    delete every base on disk.
  - Nothing else asks before removing: whether to confirm is the application's decision.
  - A base build holds its base through a `base:<key>` claim from `@loopstack/claims`, scoped to the run doing
    the build, which `beginBaseGeneration` now takes as its third argument. The claim lives exactly as long as
    that run, so there is no heartbeat to refresh and no staleness threshold to break: a build whose process
    died frees its base by itself. It **refuses** a second provision of the same base rather than waiting for
    the first — waiting held the waiting run's task slot for the length of a build — and the refusal names the
    run that holds it.
  - Requires PostgreSQL, Docker on the host, and an agent image serving `/git/clone`, `/git/fetch` and
    `/git/push` — the three git calls that carry a token, which the agent applies through a throwaway
    `GIT_ASKPASS` so it never reaches the URL, argv or `.git/config`.

### Patch Changes

- Updated dependencies [[`c6a1c35`](https://github.com/loopstack-ai/loopstack/commit/c6a1c3575081f846cea34d3095be63f825511ca7), [`2ea921f`](https://github.com/loopstack-ai/loopstack/commit/2ea921f59e64f3aa6208ac5e429f085725865522)]:
  - @loopstack/claims@0.1.0
  - @loopstack/common@0.45.0
  - @loopstack/hitl@0.6.4
