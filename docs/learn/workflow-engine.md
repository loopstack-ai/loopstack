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

If your transition method throws an error:

1. The database transaction is **rolled back** — neither the new state nor the checkpoint is written
2. The in-memory document cache is restored to its pre-transition snapshot — documents saved during the failed transition are discarded
3. The error is recorded on the workflow entity
4. The workflow stays at its current place — as if the transition never ran

This is what "automatic rollback" means in practice: a partially-executed transition leaves no trace. The workflow stays exactly where it was before the attempt.

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
async callExternalApi(state: MyState): Promise<MyState> {
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

When the trigger arrives, a new BullMQ job is enqueued with the transition payload. The job loads the checkpoint, executes the wait transition (passing the payload to the method), and then continues the auto-transition loop from the new place.

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
async processData(state: MyState): Promise<MyState> {
  // ...
}
```

Set `timeout: 0` to disable the timeout entirely for a specific transition.

---

## Stateless Execution

When a workflow runs with `{ stateless: true }` (used for testing or one-off execution), the engine skips all persistence:

- No database transactions
- No checkpoints
- Documents are kept in memory only
- All transitions run synchronously in a single pass

---

## Next Steps

- [Error Handling](/docs/build/patterns/error-handling) — retry configs, custom error places, and the Studio retry button
- [Architecture Overview](/docs/learn/architecture) — how the engine fits into the broader system
- [Why Documents Exist](/docs/learn/document-store) — the document store and its relationship to workflow state
