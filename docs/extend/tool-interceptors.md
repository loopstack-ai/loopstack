---
title: Tool Interceptors
description: Advanced — register chain-based interceptors around every tool.call() for cross-cutting concerns (quota tracking, caching, structured logging, error handling). Covers the ToolInterceptor interface, @UseToolInterceptor() decorator, ToolExecutionContext, priority ordering, and the built-in ToolLoggingInterceptor.
---

# Tool Interceptors

Tool interceptors are a chain-based extension point that wraps every `tool.call()` in your app. They are the right surface for cross-cutting concerns that should run around _every_ tool call without changing tool implementations — quota enforcement, response caching, structured tracing, custom error handling, billing accounting.

This is an advanced extension point. Most apps don't need a custom interceptor — the framework already ships `ToolLoggingInterceptor` for timing/logging, and the `@loopstack/quota` registry feature includes a working `QuotaInterceptor` you can copy.

## How They Work

Interceptors form a NestJS-style chain. Each interceptor calls `next()` to pass control to the next interceptor (or, eventually, to the tool's `handle()`). You can:

- run logic before and after the tool call
- transform the result
- short-circuit by not calling `next()` (e.g. cache hit returns a result directly)
- handle errors with `try/catch` around `next()`

The chain is built once at app bootstrap from every NestJS provider decorated with `@UseToolInterceptor()`. Ordering is controlled by `priority` — **lower runs first / outermost**. The built-in `ToolLoggingInterceptor` uses priority `0` so its timing includes every other interceptor.

```
caller → ToolLoggingInterceptor(0) → CacheInterceptor(50) → QuotaInterceptor(80) → tool.handle()
```

## Implementing an Interceptor

Implement `ToolInterceptor` and decorate with `@UseToolInterceptor({ priority? })`. The decorator applies `@Injectable()` for you, so the class only needs to be registered in a NestJS module like any other provider.

```typescript
import { ToolExecutionContext, ToolInterceptor, ToolResult, UseToolInterceptor } from '@loopstack/common';

@UseToolInterceptor({ priority: 50 })
export class CacheInterceptor implements ToolInterceptor {
  private readonly cache = new Map<string, ToolResult>();

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolResult>): Promise<ToolResult> {
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

| Field        | Type                                   | Notes                                                                                                                                                                  |
| ------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool`       | `object`                               | The tool instance. Use `context.tool.constructor.name` for the class name.                                                                                             |
| `args`       | `Record<string, unknown> \| undefined` | The arguments passed to `tool.call()` (post-validation when reaching `handle()`).                                                                                      |
| `runContext` | `RunContext`                           | The per-job framework context: `userId`, `workspaceId`, `workflowId`, `args`.                                                                                          |
| `metadata`   | `Record<string, unknown>`              | **Mutable.** Use this to pass data between interceptors in the chain (e.g. cache key, timings, quota cost). The built-in logging interceptor writes `durationMs` here. |

## Priority Ordering

`priority` is a number. **Lower runs first / outermost** — that interceptor wraps every later one.

| Priority | Position  | Use for                                                         |
| -------- | --------- | --------------------------------------------------------------- |
| `0`      | outermost | Logging, tracing — see everything that happens inside.          |
| `1–50`   | early     | Auth gates, request validation, kill-switches.                  |
| `50–100` | middle    | Caching, idempotency, response transformation.                  |
| `>100`   | inner     | Per-tool accounting (quota debit, billing) close to `handle()`. |

`@UseToolInterceptor()` defaults to `100` when omitted.

## Built-in Interceptors

- **`ToolLoggingInterceptor`** (priority `0`) — auto-registered by `LoopCoreModule`. Logs each tool's start/finish/timing and writes `context.metadata.durationMs`. Source: `loopstack/packages/core/src/workflow-processor/services/tool-logging.interceptor.ts`.

## Real-world Example: Quota

The `@loopstack/quota` package ships a `QuotaInterceptor` that uses the chain pattern to enforce per-user quotas before the tool runs and report usage after:

```typescript
@UseToolInterceptor({ priority: 80 })
export class QuotaInterceptor implements ToolInterceptor {
  async intercept(context: ToolExecutionContext, next: () => Promise<ToolResult>): Promise<ToolResult> {
    const userId = context.runContext.userId;
    await this.checkQuota(userId, context.tool);
    const result = await next();
    await this.reportUsage(userId, context.tool, result);
    return result;
  }
}
```

See `loopstack/registry/features/quota-module/src/services/quota.interceptor.ts` for the full implementation.
