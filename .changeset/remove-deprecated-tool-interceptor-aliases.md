---
'@loopstack/common': minor
---

Remove the `ToolExecutionInterceptor` type and the `TOOL_INTERCEPTORS` and `TOOL_EXECUTION_INTERCEPTORS`
tokens from `@loopstack/common`.

Nothing reads these tokens, so a provider registered under them was never called. A tool interceptor
implements `ToolInterceptor` and is marked with `@UseToolInterceptor()`; the framework discovers it at
module init:

```ts
@UseToolInterceptor()
export class MyInterceptor implements ToolInterceptor {
  async intercept(context: ToolExecutionContext, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope> {
    return next();
  }
}
```
