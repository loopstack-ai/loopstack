---
title: Lifecycle Events
description: In-process lifecycle events a host app listens to with @OnEvent from @nestjs/event-emitter — workflow.settled (WORKFLOW_SETTLED, WorkflowSettledEvent from @loopstack/core) when a run completes, fails or is canceled, and workflow.deleted / workspace.deleted when a run or workspace is deleted. Payload fields, when each event is emitted, the cascade rule for workspace and sub-workflow deletes, error handling, and why listeners must be idempotent.
---

# Lifecycle Events

An app often holds something for a run or a workspace that Loopstack does not know about: a checkout on disk, a container, a reserved slot, a row in its own tables. Loopstack emits in-process events when a run ends and when a run or workspace is deleted, so the app can release those resources without polling.

## The events

| Event               | Emitted when                                      | Payload                                                                                     |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `workflow.settled`  | A run reaches `completed`, `failed` or `canceled` | `WorkflowSettledEvent` — `id`, `workspaceId`, `workflowName`, `parentId?`, `status`, `user` |
| `workflow.deleted`  | A run is deleted through the API                  | `{ id, workspaceId, user }`                                                                 |
| `workspace.deleted` | A workspace is deleted through the API            | `{ id, appName, user }`                                                                     |

`user` is the ID of the user the run or workspace belongs to.

### `workflow.settled`

`@loopstack/core` exports the event name as `WORKFLOW_SETTLED` and the payload type as `WorkflowSettledEvent`. The event fires once a run reaches a state it does not leave by itself: `completed`, `failed` or `canceled`. Every path that ends a run emits it — a processing pass that reaches a terminal state, a job the queue gave up on, and a cancellation.

- It is emitted after the run's own persistence has committed.
- It is emitted for sub-workflows as well as root runs. `parentId` is set only for a sub-workflow, so a listener that cares only about root runs checks that `parentId` is absent.

### `workflow.deleted` and `workspace.deleted`

`@loopstack/api` emits these after the delete has committed — once per deleted run or workspace, from the single delete and from the batch delete endpoint. In a batch delete, only the items that were actually deleted emit an event; IDs that were not found or not deleted emit nothing.

The database removes dependent rows by cascade, and a **cascaded delete emits no event of its own**:

- Deleting a workspace deletes all its runs, but emits only `workspace.deleted`. A `workspace.deleted` listener must release everything the workspace owned, including what it holds per run.
- Deleting a run deletes its sub-workflows, but emits `workflow.deleted` only for the run that was deleted.

Rows deleted directly in the database, outside the API, emit nothing.

## Listening to an event

The events go through the NestJS event emitter that `LoopstackModule` registers. They do not leave the process: a listener is an `@Injectable()` provider with an `@OnEvent()` method, registered in a module of your app. `OnEvent` comes from `@nestjs/event-emitter`; add it to your app's dependencies.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WORKFLOW_SETTLED, type WorkflowSettledEvent } from '@loopstack/core';

@Injectable()
export class PreviewCleanupListener {
  private readonly logger = new Logger(PreviewCleanupListener.name);

  constructor(private readonly previews: PreviewService) {}

  @OnEvent(WORKFLOW_SETTLED)
  async onSettled(event: WorkflowSettledEvent) {
    if (event.parentId) return; // only root runs hold a preview
    await this.previews.stopForRun(event.id);
  }

  @OnEvent('workflow.deleted')
  async onWorkflowDeleted(payload: { id: string; workspaceId: string; user: string }) {
    await this.previews.removeForRun(payload.id);
  }

  @OnEvent('workspace.deleted')
  async onWorkspaceDeleted(payload: { id: string; appName: string; user: string }) {
    // Runs deleted with the workspace emit no workflow.deleted — release them here.
    await this.previews.removeForWorkspace(payload.id);
  }
}
```

```typescript
@Module({
  providers: [PreviewService, PreviewCleanupListener],
})
export class MyAppModule {}
```

### Rules for listeners

- **Make them idempotent.** There is no guarantee that an event arrives exactly once, and a process that stops before the listener ran never sees it. Release operations must tolerate a second call. When correctness depends on the release, also reconcile against the stored state (for example, sweep for resources whose run or workspace no longer exists) and treat the event as the prompt to do it early.
- **Do not depend on the caller waiting.** The emitter does not await an async listener. The delete request returns and the run continues while your listener is still working, so a slow cleanup does not block anything.
- **Errors do not reach the caller.** `@OnEvent` catches and logs an error thrown by its listener by default, so a failing listener does not fail the delete or the run. A failed `workflow.settled` listener also does not stop the parent run's callback. Log what you could not release, so the next sweep can find it.

## Real listeners

Two registry packages release their resources this way:

- [`@loopstack/claims`](/docs/registry/claims#a-claim-cannot-be-left-behind) releases resource claims on `workflow.settled`, `workflow.deleted` and `workspace.deleted`.
- [`@loopstack/code-workspace`](/docs/registry/code-workspace#reclamation) removes checkouts, containers and volumes on `workflow.deleted` and `workspace.deleted`, and runs an orphan sweep for anything a listener missed.

For events that describe what happens _inside_ a run — workflow and document updates as they stream to Studio — see the `client.message` listener in the [Audit Log example](/docs/examples/observability#audit-log).
