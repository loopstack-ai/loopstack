---
title: How the Workflow Engine Works
description: Internals of the workflow engine — state persistence in PostgreSQL, BullMQ job processing, database transactions for atomic transitions, retry mechanics, and error recovery.
---

# How the Workflow Engine Works

This page explains what happens under the hood when a Loopstack workflow runs — how state is persisted, how transactions protect against partial failures, and how retries work.

---

## The Core Idea: Durable State Machines

A Loopstack workflow is a **state machine backed by a database**. Each step (transition) moves the machine from one place to another. The current place and all workflow state are written to PostgreSQL after every step — not just at the end.

This means:

- A workflow that pauses waiting for human input can wait for minutes, hours, or days
- If your server restarts mid-run, the workflow resumes from exactly the last completed step
- Failed transitions don't corrupt state — each step is atomic

---

## Execution Model

### Jobs, Not Threads

Transitions don't run in a long-lived thread. Each processing pass is a **BullMQ job**:

1. A job is enqueued when a workflow is started or when a user triggers a `wait: true` transition
2. The BullMQ worker inside your NestJS app picks up the job
3. The engine loads the latest checkpoint from PostgreSQL, then runs as many auto-transitions as it can in a loop
4. The job ends when it hits a `wait: true` transition or `end` — or when it encounters an error

The loop looks like this conceptually:

```
load state from latest checkpoint
while (there are auto-transitions available):
    run the next transition
    save checkpoint to PostgreSQL
    if error: handle and stop
end when: wait | end | error
```

This is why workflows survive server restarts: the job ends and the state is safely in PostgreSQL. When the next job runs (triggered by a user action or retry), it picks up exactly from where the previous job left off.

---

## Transactions and Rollback

Each transition runs inside a **database transaction**:

```
start transaction
  → call your transition method
  → save updated state to workflow entity
  → write a new checkpoint row
commit (or rollback on error)
```

Transitions return nothing — mutate state via `this.assignState(...)`. Use `async` when the body awaits. State is mutated through four setters on `BaseWorkflow`:

- `this.assignState(partial)` — shallow-merge `partial` into the current state. The most common form: `this.assignState({ counter: 1 })` leaves every other field untouched.
- `this.setState(full)` — replace the state object outright.
- `this.assignResult(partial)` — shallow-merge `partial` into the run's published `result` field. Use this on the final transition (or any earlier transition that wants to surface partial output) to build the value returned to callers and parent workflows.
- `this.setResult(full)` — replace the published `result` outright.

Returning a value from a transition is a runtime error — the engine throws when it sees one. Every write goes through `assignState` / `setState` / `assignResult` / `setResult`.

If your transition method throws an error:

1. The database transaction is **rolled back** — neither the new state nor the checkpoint is written
2. The in-memory document cache is restored to its pre-transition snapshot — documents saved during the failed transition are discarded
3. The error is recorded on the workflow entity
4. The workflow stays at its current place — as if the transition never ran

This is what "automatic rollback" means in practice: a partially-executed transition leaves no trace. The workflow stays exactly where it was before the attempt.

### ErrorDocument

After the rollback completes, the engine writes a single `ErrorDocument` to the run with the thrown error's message. This is the only side-effect of a failed transition that survives the rollback — it lives **outside** the failed transaction so the audit trail is preserved. Subsequent retry attempts each add their own `ErrorDocument`, giving a full per-attempt history.

`ErrorDocument` is a built-in document type (`@loopstack/common`) that workflow authors don't construct manually — it's an engine-managed artifact. See [Error Handling](../build/patterns/error-handling.md) for the retry/recovery patterns that consume it.

---

## Checkpoints

After every successful transition, the engine writes a **checkpoint** row to PostgreSQL. A checkpoint contains:

- The current **place** (e.g. `waiting_for_approval`)
- A snapshot of the **state object** at that point in time
- The **document IDs** visible at that transition
- A **version number** that increments with each step

When the next job runs, it loads the latest checkpoint and restores state from it. This is the mechanism that makes workflows resumable across restarts.

---

## Retries

When a transition fails, the engine checks the retry configuration on that transition. By default, workflows don't retry automatically — they stay at the failed place for **manual retry** via the Studio UI.

To configure automatic retries:

```typescript
@Transition({
  from: 'calling_api',
  to: 'api_complete',
  retry: {
    attempts: 3,
    delay: 1000,       // ms before first retry
    backoff: 'exponential',
    maxDelay: 30000,   // cap at 30 seconds
  },
})
async callExternalApi(state: MyState) {
  // ...
}
```

**How exponential backoff is calculated:**

```
attempt 1: delay × 2^0 = 1000ms
attempt 2: delay × 2^1 = 2000ms
attempt 3: delay × 2^2 = 4000ms (capped at maxDelay)
```

The delay is implemented as a BullMQ job delay — the job is re-queued with a scheduled execution time. Nothing blocks during the wait.

**After retries are exhausted:**

If all retry attempts fail, you can route the workflow to a custom error-handling place:

```typescript
retry: {
  attempts: 3,
  place: 'error_handling',  // go here instead of staying at current place
}
```

Without `place`, the workflow stays at the current place with `hasError: true`. The Studio toolbar shows a **Retry** button that re-triggers the failed transition immediately.

---

## Wait Transitions

`wait: true` transitions are fundamentally different from auto-transitions. They don't run automatically — they pause the workflow and wait for an external trigger.

When the engine encounters a place where the only available transition has `wait: true`:

1. The job ends — the workflow is saved with `status: waiting`
2. Nothing more runs until an external trigger arrives
3. The trigger can come from: a Studio button click, a sub-workflow callback, or an API call

When the trigger arrives, a new BullMQ job is enqueued with the resume payload. The job loads the checkpoint, then invokes the wait transition with a `TransitionInput<TData>` envelope — `data` is validated against the transition's `schema`, and `status` / `hasError` / `errorMessage` reflect how the trigger source ended. After the wait transition returns, the auto-transition loop continues from the new place.

This is why a paused workflow survives restarts: the trigger doesn't need to arrive while the original job is running. It can arrive seconds or weeks later — the checkpoint is in PostgreSQL waiting for it.

---

## Timeouts

Each transition has a default timeout of **5 minutes** (`DEFAULT_TRANSITION_TIMEOUT=300000`). If a transition doesn't complete within the timeout, it's treated as a failure and the retry logic applies.

Override the default for specific transitions:

```typescript
@Transition({
  from: 'processing',
  to: 'done',
  timeout: 60000,  // 1 minute for this transition
})
async processData(state: MyState) {
  // ...
}
```

Set `timeout: 0` to disable the timeout entirely for a specific transition.

---

## Workflow Lifecycle States

Each workflow run has a `status` from the `WorkflowState` enum, persisted on the workflow entity. The engine sets it as the run progresses.

| State       | Description                                                                                                             | Set by                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pending`   | Run created, not yet picked up by a worker (or re-queued after a wait/error).                                           | Initial value when a run is created, and again when a wait transition is resumed.         |
| `running`   | A worker is currently executing a transition for this run.                                                              | Root processor at the start of each job.                                                  |
| `waiting`   | Run is paused — either waiting for an external trigger (wait transition) or waiting for a retry/sub-workflow.           | Processor when a job ends without reaching `end` and without an error that fails the run. |
| `completed` | Final transition reached `to: 'end'`. The `result` field holds whatever was published via `assignResult` / `setResult`. | Processor when a transition moves to `end`.                                               |
| `failed`    | A transition errored and retries are exhausted (or the error has no retry).                                             | Processor on terminal failure.                                                            |
| `canceled`  | Cancellation was requested — recursively applied to all child runs. Parent callback fires with `canceled` status.       | `WorkflowOrchestrationService.cancel()`.                                                  |
| `paused`    | Reserved — currently not set by the engine. Treated like `waiting` in queries (e.g. dashboard "action required").       | —                                                                                         |

Terminal states are `completed`, `failed`, and `canceled` — no further work is scheduled for them, and any parent sub-workflow callback fires once the terminal state is reached.

## Stateless Execution

A workflow can run in **stateless mode** via `WorkflowRunner.runSync({ stateless: true, … })`. The engine skips all persistence and runs the entire state machine in a single pass:

- No database transactions
- No checkpoints
- Documents created via `documentStore.save()` live in memory for the duration of the run and are returned in the result — they are not written to the database
- All transitions run synchronously in one pass; the call returns when the workflow reaches `end` (or errors)

Use stateless execution when:

- **Testing workflows** — assert against the returned result and in-memory documents without spinning up Postgres/Redis (see `createStatelessContext` in `@loopstack/testing`).
- **One-off computations** — synchronous request/response flows where you want the workflow logic but don't need durability or resumability (e.g. an internal API endpoint that computes something via a workflow and returns immediately).
- **Dry-runs / previews** — verify a workflow's output for a given input without leaving a record.

Stateless runs cannot pause: `wait: true` transitions and sub-workflow `queue()` calls aren't useful here, because there's no run to resume. Use the regular durable path for those.

See [Programmatic Execution](../build/integrations/programmatic-execution.md) for the `runSync()` API.

---

## Next Steps

- [Error Handling](../build/patterns/error-handling.md) — retry configs, custom error places, and the Studio retry button
- [Architecture Overview](./architecture.md) — how the engine fits into the broader system
- [Why Documents Exist](./document-store.md) — the document store and its relationship to workflow state
