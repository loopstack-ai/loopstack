---
'@loopstack/code-workspace': minor
---

New registry feature: isolated per-run checkouts, and their whole life.

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
