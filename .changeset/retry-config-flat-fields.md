---
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/llm-provider-module': patch
'@loopstack/advanced-workflows-examples': patch
'@loopstack/agent-examples': patch
---

Failure-handling on `@Transition` is now expressed as flat fields instead of a nested `retry` object, and the framework treats sync throws, timeouts, and sub-workflow failure callbacks under a single decision tree (auto-retry → `errorPlace` → manual retry).

**Decorator surface:**

```ts
@Transition({
  from, to,
  retryAttempts?: number,            // -1 = unlimited manual retry (default).
                                     //  0 = no auto-retry (default when errorPlace is set).
                                     // N>0 = up to N auto-retries.
  retryDelay?: number,               // Base ms (default 1000).
  retryBackoff?: 'fixed' | 'exponential',  // default 'exponential'.
  retryMaxDelay?: number,            // ms cap for backoff (default 30000).
  retryTarget?: string,              // Re-enter this place on each retry, instead of re-running the failing transition.
  errorPlace?: string,               // Where to route when retries are exhausted (or no retry configured).
  timeout?: number,
})
```

`retryTarget` is new: it lets a retry land on a different place so a recovery transition (token refresh, cache invalidation, etc.) runs before the failing transition is re-attempted. The transitions reached via `retryTarget` have their own independent retry budget — failures there don't consume the originating transition's attempts.

Wait transitions that resume from a sub-workflow callback now obey the same rules: a `status: 'failed' | 'canceled'` callback runs through the same decision tree. With `errorPlace` declared, the framework treats the failure as the wait transition failing and skips the body entirely — protecting schema-validated bodies from receiving `null` / malformed data when the child never reached `setResult(...)`. Without `errorPlace` (or `retryAttempts`), the body still fires for accumulator patterns (e.g. LLM tool delegation) where the body itself inspects error results.

**Breaking changes:**

- `RetryConfig`, `NormalizedRetryConfig`, and `normalizeRetryConfig` are removed from `@loopstack/common`.
- `@Transition({ retry: 3 })` → `@Transition({ retryAttempts: 3 })`.
- `@Transition({ retry: { place: 'x' } })` → `@Transition({ errorPlace: 'x' })`. When `errorPlace` is set without `retryAttempts`, attempts default to `0` (route on first failure) — matching the previous semantics.
- `@Transition({ retry: { attempts, delay, backoff, maxDelay, place } })` → individual `retryAttempts`/`retryDelay`/`retryBackoff`/`retryMaxDelay`/`errorPlace` fields.

**Migration:**

```ts
// Before
@Transition({ from: 'fetching', to: 'done', retry: 3 })
@Transition({ from: 'processing', to: 'done', retry: { place: 'error_processing' } })
@Transition({ from: 'deploying', to: 'deployed', retry: { attempts: 2, place: 'deploy_failed' } })

// After
@Transition({ from: 'fetching', to: 'done', retryAttempts: 3 })
@Transition({ from: 'processing', to: 'done', errorPlace: 'error_processing' })
@Transition({ from: 'deploying', to: 'deployed', retryAttempts: 2, errorPlace: 'deploy_failed' })
```

`LlmDelegateService` now overwrites both `data` and `error` when a sub-workflow tool result reports failure — previously the misleading success payload could leak to the LLM alongside `isError: true`. The `error-retry` and new `agent-error-handling` examples (the latter moved from `@loopstack/agent-examples` into `@loopstack/advanced-workflows-examples`) demonstrate the full set of patterns. Docs (`build/patterns/error-handling.md`) are swept to the new shape with sections for `retryTarget` and sub-workflow failure callbacks.
