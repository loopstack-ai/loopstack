---
title: Error Handling, Retry & Timeout
description: Recovering from transition errors with auto-retry and exponential backoff, retryTarget for retry-via-another-place, errorPlace routing for sync throws and sub-workflow failure callbacks, manual retry via Studio UI, and transition timeouts.
---

# Error Handling, Retry & Timeout

When a transition fails — by throwing, timing out, or receiving a `failed` / `canceled` callback from a sub-workflow — the framework rolls back local changes and then runs a single decision tree:

1. **Auto-retry** if `retryAttempts` has budget left.
2. **Route to `errorPlace`** if declared (retries exhausted, or no retries configured).
3. **Manual retry (default)** — stay at the current place and surface a Retry button in the UI.

The same rule applies to sync throws, timeouts, and sub-workflow failure callbacks — there's one mental model.

## Retry Modes

### Auto-Retry

Automatically re-run a failed transition with exponential backoff:

```typescript
@Transition({ from: 'fetching', to: 'done', retryAttempts: 3 })
async fetchData() {
  await this.httpClient.call({ url: 'https://api.example.com/data' });
}
```

If `fetchData` throws, the framework retries up to 3 times with exponential delays (1s, 2s, 4s). The workflow stays at the `fetching` place during retries.

### Retry via a Different Place (`retryTarget`)

Some retries need preparation work between attempts — refresh a token, invalidate a cache, log out and back in. `retryTarget` moves the workflow to a different place on each auto-retry, instead of re-running the failing transition directly:

```typescript
@Transition({
  from: 'fetching', to: 'done',
  retryAttempts: 3,
  retryTarget: 'refresh_credentials',
})
async callApi() {
  await this.api.call({ ... });
}

@Transition({ from: 'refresh_credentials', to: 'fetching' })
async refreshCredentials() {
  await this.auth.refreshToken();
}
```

On failure, `callApi`'s retry budget is decremented, the workflow jumps to `refresh_credentials`, the refresh transition runs, and the workflow loops back to `fetching` to re-attempt `callApi`. Transitions inside the retry target have their own independent retry budget — a failure in `refreshCredentials` doesn't consume `callApi`'s attempts.

### Custom Error Place (`errorPlace`)

Route to a dedicated error state when a transition fails:

```typescript
@Transition({ from: 'processing', to: 'done', errorPlace: 'error_processing' })
async processData() {
  await this.processor.call({ data: this.rawData });
}

@Transition({ from: 'error_processing', to: 'done', wait: true })
async handleProcessingError() {
  // Recovery logic — user clicks a "Recover" button to trigger this
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: 'Processing failed. Retrying with fallback strategy.',
  });
}
```

The workflow transitions to `error_processing` where you define recovery logic via `wait: true` transitions (buttons in the UI). When `errorPlace` is set without `retryAttempts`, attempts default to `0` — failures route straight to the error place on the first try.

### Manual Retry (Default)

When no failure handling is specified, the workflow stays at the current place and shows a "Retry" button:

```typescript
@Transition({ from: 'sending', to: 'sent' })
async sendEmail() {
  await this.email.call({ to: 'user@example.com', body: this.content });
}
```

If it fails, the user sees the error message and can retry manually. No auto-retry, no error place — just pause and let the user decide.

### Hybrid: Auto-Retry + Error Place

Combine auto-retry with a fallback error state:

```typescript
@Transition({
  from: 'deploying',
  to: 'deployed',
  retryAttempts: 2,
  errorPlace: 'deploy_failed',
})
async deploy() {
  await this.deployer.call({ target: 'production' });
}

@Transition({ from: 'deploy_failed', to: 'deployed', wait: true })
async retryDeploy() {
  // Manual recovery after auto-retries exhausted
}
```

Retries twice automatically. If both fail, transitions to `deploy_failed` for manual intervention.

## Sub-Workflow Failure Callbacks

A wait transition that resumes from a sub-workflow callback can fail just like a synchronous transition — when the child finishes with `status: failed` or `canceled`. The same `retryAttempts` / `retryTarget` / `errorPlace` rules apply:

```typescript
@Transition({ from: 'awaiting_child', to: 'done', wait: true, errorPlace: 'sub_failed' })
async childCompleted(_state, _input) {
  // Happy path only — the child succeeded.
}

@Transition({ from: 'sub_failed', to: 'done', wait: true })
async handleSubFailed() {
  // Recovery when the child failed — surfaces a Recover button.
}
```

Without `errorPlace` (or `retryAttempts`), a sub-workflow failure callback still fires the body — for accumulator patterns where the body itself handles error results (e.g. LLM tool delegation). With either declared, the framework treats the failure as the wait transition failing and skips the body entirely. That protects schema-validated bodies from receiving `null` / malformed data when the child never reached `setResult(...)`.

## Failure-Handling Configuration

```typescript
retryAttempts?: number           // -1 = unlimited manual retry (default).
                                 // 0 = no auto-retry (default when errorPlace is set).
                                 // N>0 = up to N auto-retries.
retryDelay?: number              // Base delay in ms (default: 1000).
retryBackoff?: 'fixed' | 'exponential'  // (default: 'exponential')
retryMaxDelay?: number           // Backoff cap in ms (default: 30000).
retryTarget?: string             // Re-enter this place on each auto-retry, instead of re-running this transition.
errorPlace?: string              // Where to route when retries are exhausted (or no retry is configured).
```

**Backoff calculation (exponential):** `retryDelay * 2^(attempt - 1)`, capped at `retryMaxDelay`.

| Attempt | Delay (default config) |
| ------- | ---------------------- |
| 1       | 1,000ms                |
| 2       | 2,000ms                |
| 3       | 4,000ms                |
| 4       | 8,000ms                |
| 5       | 16,000ms               |
| 6+      | 30,000ms (capped)      |

### Reading the retry count

Transitions can access the current retry count through `ctx.execution.retryCount`. It is 0-indexed: `0` on the first attempt, `1` after the first retry, and so on. Add `1` for a human-friendly attempt number when logging or branching on retries.

```typescript
@Transition({ from: 'fetching', to: 'done', retryAttempts: 3 })
async fetchData(state: MyState, ctx: RunContext) {
  const attempt = (ctx.execution?.retryCount ?? 0) + 1;
  this.logger.log(`Fetch attempt ${attempt}`);
  // ...
}
```

`ctx.execution` is optional in the type — guard with `?.` or `!` depending on your call site. `ctx.execution.place` is also available for the current place name.

## Timeout

Every transition has a default timeout of **5 minutes** (300,000ms). If a transition takes longer, it's interrupted with `Error: Transition '...' timed out after ...ms` and flows through the normal retry logic.

You can override the default globally with the `DEFAULT_TRANSITION_TIMEOUT` environment variable (in ms), or per-transition:

```typescript
@Transition({ from: 'analyzing', to: 'analyzed', timeout: 5000 })
async analyzeData() {
  await this.analyzer.call({ dataset: this.data });
}
```

To disable the timeout for a specific transition, set `timeout: 0`:

```typescript
@Transition({ from: 'processing', to: 'done', timeout: 0 })
async longRunningTask() {
  // No timeout — runs until completion
}
```

You can combine timeout with retry:

```typescript
@Transition({
  from: 'analyzing',
  to: 'analyzed',
  timeout: 5000,
  retryAttempts: 2,
})
async analyzeData() {
  await this.analyzer.call({ dataset: this.data });
}
```

Times out after 5s, retries up to 2 times, then falls to manual retry.

## What Gets Rolled Back

When a transition fails, the framework rolls back:

- **Documents** created during the transition (restored from snapshot)
- **Database changes** within the transition's transaction
- **Workflow state** stays at the pre-transition place

What is **not** rolled back:

- An `ErrorDocument` is saved after rollback as an audit trail
- The error message is stored in workflow metadata
- Workflow instance variables (`this.someField`) persist across retries — useful for attempt counters

## ErrorDocument

Every failed transition creates an `ErrorDocument` with the error message:

```typescript
// Automatically created by the framework:
{
  className: 'ErrorDocument',
  content: { error: 'Connection refused: api.example.com' }
}
```

Multiple `ErrorDocument`s accumulate if retries fail repeatedly — giving a full audit trail of each attempt.

## Registry References

- [error-retry-example-workflow](https://loopstack.ai/registry/loopstack-advanced-workflows-examples#error-retry) — Demonstrates all seven retry modes: auto-retry, manual retry, custom error place, timeout, hybrid, `retryTarget`, and sub-workflow failure callback routed via `errorPlace`.
