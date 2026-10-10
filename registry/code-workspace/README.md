---
title: Code Workspace Module
description: '@loopstack/code-workspace — isolated per-run checkouts from shared generational bases, worked in disposable Docker containers. Provisioning, inventory and reclamation of repos, checkouts, containers and volumes with CodeWorkspaceModule and CodeWorkspaceMaintenanceModule.'
---

# @loopstack/code-workspace

Isolated per-run checkouts of a codebase, cloned from a shared base and worked in disposable Docker
containers. Provisioning, inventory and reclamation — the whole life of that state.

Domain-neutral: it knows about repos, checkouts, containers and volumes, and nothing about what you do in
them.

## Install

```bash
npm install @loopstack/code-workspace
```

Requires **PostgreSQL** (the inventory joins against the workflow and workspace tables) and **Docker on the
host**, reachable by the process.

## Register

```ts
import { CodeWorkspaceModule } from '@loopstack/code-workspace';

@Module({
  imports: [
    CodeWorkspaceModule.forRoot({
      stateDir: '~/.my-app',
      namespace: 'acme.sandbox',
    }),
  ],
})
export class AppModule {}
```

`forRootAsync({ inject, useFactory })` is there for configuration that comes from the environment.

**`namespace`** is how the module finds its own things again: every container and volume it creates is
labelled `<namespace>.workspace` and `<namespace>.workflow` and named from the same string, and every sweep
filters on exactly those. Two applications with different namespaces never see — or remove — each other's
containers. It defaults to `loopstack`, which yields `loopstack.workspace` and `loopstack.workflow`.

❗ Changing it on a running installation makes everything created under the old one invisible to the sweep.
Reclaim first, then change it.

## Provisioning

Inject the provisioner through its token, never the class, so another implementation can take its place:

```ts
constructor(@Inject(CODE_WORKSPACE_PROVISIONER) private readonly workspace: CodeWorkspaceProvisioner) {}
```

- **Bases** are shared, immutable and generational, keyed by the hash of their provision config — the repos,
  the setup commands, the seed images. A build holds its base with an exclusive claim scoped to the run doing
  it, so two runs cannot build the same generation twice and a build whose process died frees its base by
  itself. A second provision of a base already being built is refused, not queued. Several workspaces with the same config share one, and a published
  generation is never mutated: a refresh copies it, updates the copy, and swaps a `current` pointer, so a
  checkout reads the generation it resolved and nothing else changes under it.
- **Checkouts** are one clone of a base per run, cheap (the git object store and the build output are cloned
  copy-on-write or hardlinked) and safe (git and npm unlink and rewrite, so a run never mutates the base).
- **Containers** mount a checkout and are explicitly torn down, so a crashed one keeps its logs until
  something removes it.

## Reclamation

Three ways, and the first needs nothing from you:

1. **Automatic.** A listener on `workspace.deleted` and `workflow.deleted` releases that workspace's or that
   run's containers, volumes and files. It runs in the background — `emit` does not await an async listener —
   and never throws, because nothing is waiting to catch it.
2. **By inventory.** `WorkspaceInventoryService.scan()` returns what exists on disk and in Docker, joined
   against the workflow and workspace tables, and `orphanPlan(inventory, knownBaseKeys)` says what has no
   owner left: state whose row was deleted, and bases no config declares any more. `renderInventory` and
   `renderOrphanPlan` give you the Markdown.
3. **Directly.** `removeWorkflowCheckout`, `removeWorkspaceState`, `removeBase` and
   `collectBaseGenerations`, all idempotent, all in dependency order: containers, then volumes, then files,
   so a failure at any step leaves the operation re-runnable.

Nothing here asks before it removes. **Whether to confirm is the application's decision** — put a
confirmation in front of calls 2 and 3 if your users should have one.

`CodeWorkspaceMaintenanceModule` is one ready-made answer, imported separately:

```ts
import { CodeWorkspaceMaintenanceModule } from '@loopstack/code-workspace';
```

It adds a Studio app with two workflows. **State Report** lists every workspace with its sizes, checkouts,
containers and volumes, and flags what has no owner left — read-only, and the only view that shows state
which is _not_ an orphan, which is what you decide against when choosing what to delete. **Clean Up Orphaned
State** then removes what nothing owns, after showing you exactly what that is.

Both read `knownBaseKeys` from the module's options. Leave it unset and no base is ever proposed for
removal, which is the safe reading of "none declared".

## The git routes

`RepoGitClient` posts to `/git/clone`, `/git/fetch` and `/git/push` on the in-container agent. Those three
carry a **token**, and the agent applies it through a throwaway `GIT_ASKPASS` so it never reaches the URL,
the argv or `.git/config`. Every other git command is a plain `executeCommand(agentUrl, cmd, dir)`.

So a consumer needs an agent image whose server implements those three routes. Everything else the module
asks of the container is ordinary command execution.
