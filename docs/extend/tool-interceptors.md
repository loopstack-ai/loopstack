---
title: Tool Interceptors
description: Advanced — register chain-based interceptors around every tool.call() for cross-cutting concerns (quota tracking, caching, structured logging, error handling). Covers the ToolInterceptor interface, @UseToolInterceptor() decorator, ToolExecutionContext, priority ordering, and the shipped interceptors (QuotaInterceptor, RecordToolInterceptor/ReplayToolInterceptor, TracingInterceptor example). Tool timing is recorded on the run trace, not in metadata.
---

# Tool Interceptors

Tool interceptors are a chain-based extension point that wraps every `tool.call()` in your app. They are the right surface for cross-cutting concerns that should run around _every_ tool call without changing tool implementations — quota enforcement, response caching, structured tracing, custom error handling, billing accounting.

This is an advanced extension point. Most apps don't need a custom interceptor — the tool pipeline already times and logs every call and records it on the run trace, and the `@loopstack/quota` registry feature includes a working `QuotaInterceptor` you can copy.

## How They Work

Interceptors form a NestJS-style chain. Each interceptor calls `next()` to pass control to the next interceptor (or, eventually, to the tool's `handle()`). You can:

- run logic before and after the tool call
- transform the result
- short-circuit by not calling `next()` (e.g. cache hit returns a result directly)
- handle errors with `try/catch` around `next()`

The chain is built once at app bootstrap from every NestJS provider decorated with `@UseToolInterceptor()`. Ordering is controlled by `priority` — **lower runs first / outermost**. The framework itself registers no interceptors — the chain holds only the ones your app and its imported modules provide.

```
caller → TracingInterceptor(10) → QuotaInterceptor(50) → CacheInterceptor(60) → tool.handle()
```

In this chain the quota check wraps the cache, so cache hits still count against the quota. Give the cache a priority below `50` to let hits skip it.

Timing and logging are not part of the chain: the tool pipeline measures each call around the whole chain and records the duration on the `tool.completed` / `tool.failed` events of the [run trace](../build/fundamentals/workflows.md#the-run-trace).

## Implementing an Interceptor

Implement `ToolInterceptor` and decorate with `@UseToolInterceptor({ priority? })`. The decorator applies `@Injectable()` for you, so the class only needs to be registered in a NestJS module like any other provider.

```typescript
import { ToolEnvelope, ToolExecutionContext, ToolInterceptor, UseToolInterceptor } from '@loopstack/common';

@UseToolInterceptor({ priority: 60 })
export class CacheInterceptor implements ToolInterceptor {
  private readonly cache = new Map<string, ToolEnvelope>();

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope> {
    const key = `${context.tool.constructor.name}:${JSON.stringify(context.args)}`;

    const hit = this.cache.get(key);
    if (hit) {
      context.metadata.cacheHit = true;
      return hit; // short-circuit — `next()` not called, tool doesn't run
    }

    const result = await next();
    this.cache.set(key, result);
    return result;
  }
}
```

Register it in a module:

```typescript
@Module({
  providers: [CacheInterceptor /*, ...your tools and workflows */],
})
export class MyAppModule {}
```

That's it — bootstrap-time discovery picks it up via `@UseToolInterceptor()` metadata. No manual registration list.

## `ToolExecutionContext`

The first argument to `intercept()` carries everything an interceptor needs.

| Field        | Type                                   | Notes                                                                                                                                                                       |
| ------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool`       | `object`                               | The tool instance. Use `context.tool.constructor.name` for the class name.                                                                                                  |
| `args`       | `Record<string, unknown> \| undefined` | The arguments passed to `tool.call()` (post-validation when reaching `handle()`).                                                                                           |
| `config`     | `Record<string, unknown>`              | Optional. The call's validated config — present only when the tool was called with one.                                                                                     |
| `runContext` | `RunContext`                           | The per-job framework context: `userId`, `workspaceId`, `workflowId`, `args`.                                                                                               |
| `metadata`   | `Record<string, unknown>`              | **Mutable.** Use this to pass data between interceptors in the chain (e.g. cache key, timings, quota cost). Starts empty on every call — the framework writes nothing here. |

## Priority Ordering

`priority` is a number. **Lower runs first / outermost** — that interceptor wraps every later one.

| Priority | Position  | Use for                                                         |
| -------- | --------- | --------------------------------------------------------------- |
| `0`      | outermost | Logging, tracing — see everything that happens inside.          |
| `1–50`   | early     | Auth gates, request validation, kill-switches.                  |
| `50–100` | middle    | Caching, idempotency, response transformation.                  |
| `>100`   | inner     | Per-tool accounting (quota debit, billing) close to `handle()`. |

`@UseToolInterceptor()` defaults to `100` when omitted.

## Shipped Interceptors

The core registers no interceptors. These ship in Loopstack packages and join the chain when their module or option is used:

- **`QuotaInterceptor`** (priority `50`) — `@loopstack/quota`, registered by `QuotaModule.forRoot()`. Checks the user's quotas before the call and reports usage after it. Source: `loopstack/registry/features/quota-module/src/services/quota.interceptor.ts`.
- **`ReplayToolInterceptor`** / **`RecordToolInterceptor`** (priority `10`) — `@loopstack/testing`, registered by `runWorkflow()` only when a test replays or records tool responses (see [Record and replay tool responses](../build/testing.md#record-and-replay-tool-responses)). Source: `loopstack/packages/testing/src/facade/replay.ts` and `record.ts`.
- **`TracingInterceptor`** (priority `10`) — example in the [observability examples](/docs/examples/observability) that measures every tool call and stores trace entries in an injectable service. Source: `examples/src/observability/workflows/tracing/interceptors/tracing.interceptor.ts`.

## Real-world Example: Quota

The `@loopstack/quota` package ships a `QuotaInterceptor` that uses the chain pattern to enforce per-user quotas before the tool runs and report usage after:

```typescript
@UseToolInterceptor({ priority: 50 })
export class QuotaInterceptor implements ToolInterceptor {
  async intercept(context: ToolExecutionContext, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope> {
    const userId = context.runContext.userId;
    await this.checkQuota(userId, context.tool);
    const result = await next();
    await this.reportUsage(userId, context.tool, result);
    return result;
  }
}
```

See `loopstack/registry/features/quota-module/src/services/quota.interceptor.ts` for the full implementation.
