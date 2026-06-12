---
title: Error Handling, Retry & Timeout
description: Recovering from transition errors with auto-retry and exponential backoff, custom error state transitions, manual retry via Studio UI, and transition timeouts.
---

# Error Handling, Retry & Timeout

When a transition throws an error, the framework rolls back all changes and gives you three ways to recover: auto-retry with backoff, transition to a custom error state, or manual retry via the UI.

## Retry Modes

### Auto-Retry

Automatically re-run a failed transition with exponential backoff:

```typescript
@Transition({ from: 'fetching', to: 'done', retry: 3 })
async fetchData() {
  await this.httpClient.call({ url: 'https://api.example.com/data' });
}
```

If `fetchData` throws, the framework retries up to 3 times with exponential delays (1s, 2s, 4s). The workflow stays at the `fetching` place during retries.

### Custom Error Place

Route to a dedicated error state when a transition fails:

```typescript
@Transition({ from: 'processing', to: 'done', retry: { place: 'error_processing' } })
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

The workflow transitions to `error_processing` where you define recovery logic via `wait: true` transitions (buttons in the UI).

### Manual Retry (Default)

When no `retry` config is specified, the workflow stays at the current place and shows a "Retry" button:

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
  retry: { attempts: 2, place: 'deploy_failed' },
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

## Retry Configuration

```typescript
retry: number                    // Shorthand: number of auto-retry attempts
retry: {
  attempts?: number,             // Auto-retry count (0 = skip auto-retry, -1 = manual only)
  delay?: number,                // Base delay in ms (default: 1000)
  backoff?: 'fixed' | 'exponential',  // Backoff strategy (default: 'exponential')
  maxDelay?: number,             // Backoff cap in ms (default: 30000)
  place?: string,                // Custom error place when retries exhausted
}
```

**Backoff calculation (exponential):** `delay * 2^(attempt - 1)`, capped at `maxDelay`.

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
@Transition({ from: 'fetching', to: 'done', retry: 3 })
async fetchData(state: MyState, ctx: RunContext): Promise<MyState> {
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
  retry: 2,
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

- [error-retry-example-workflow](https://loopstack.ai/registry/loopstack-error-retry-example-workflow) — Demonstrates all five retry modes: auto-retry, manual retry, custom error place, timeout, and hybrid
