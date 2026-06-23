---
'@loopstack/common': minor
'@loopstack/llm-provider-module': minor
'@loopstack/core': patch
'@loopstack/quota': patch
'@loopstack/agent': patch
'@loopstack/claude-tools-module': patch
'@loopstack/code-agent': patch
'@loopstack/git-module': patch
'@loopstack/github-integration': patch
'@loopstack/github-module': patch
'@loopstack/google-workspace-module': patch
'@loopstack/hitl': patch
'@loopstack/mcp-module': patch
'@loopstack/oauth-module': patch
'@loopstack/remote-client': patch
'@loopstack/secrets-module': patch
'@loopstack/web-module': patch
'@loopstack/sandbox-filesystem': patch
'@loopstack/sandbox-tool': patch
'@loopstack/agent-example-workflow': patch
'@loopstack/custom-tool-example-module': patch
'@loopstack/delegate-error-example-workflow': patch
'@loopstack/error-retry-example-workflow': patch
'@loopstack/github-oauth-example': patch
'@loopstack/google-oauth-example': patch
'@loopstack/llm-multi-provider-example-workflow': patch
'@loopstack/meeting-notes-example-workflow': patch
'@loopstack/module-config-example': patch
'@loopstack/prompt-structured-output-example-workflow': patch
'@loopstack/sandbox-example-workflow': patch
'@loopstack/tool-call-example-workflow': patch
---

Split tool result types and tighten the public call surface.

- **New `ToolEnvelope<T, M>`** — the raw shape returned by `BaseTool.handle()`, `complete()`, and `ToolPipeline.execute()`. Has optional `data`, `error`, `pending`, `metadata`, `type`. This is what was previously called `ToolResult`.
- **`ToolResult<T, M>` is now the narrowed success-path return of `BaseTool.call()`** — `data` and `metadata` are non-optional. `call()` throws on the envelope's `error` and `pending` arms, so workflow authors never see them.
- **`TData` default tightened from `any` to `unknown`** on `ToolEnvelope`. Tools that declared `Promise<ToolResult>` bare without a generic must now declare `Promise<ToolEnvelope<TResult>>` to match their class-level generic (one latent type drift surfaced and fixed: `BuildOAuthUrlTool`).
- **`LlmGenerateObjectTool` accepts a Zod schema for `outputSchema`** instead of a JSON Schema object. The tool converts to JSON Schema internally for provider SDKs and validates the returned data with the same schema. `toJSONSchema(...)` ceremony and `validate: 'skip'` on document saves are no longer needed at call sites.
- **`LlmDelegateService` routes through `ToolPipeline.execute()`** directly so the agent tool-call loop still observes `error` / `pending` on the raw envelope.
- **Sweep of stale casts and `!` assertions** across examples and feature workflows: `result.metadata as LlmResultMeta` and `result.data!` are now just `result.metadata` / `result.data` (non-optional under the new narrowed shape).
- **Sweep of trailing unused parameters** on `handle()` across the registry — `_ctx: RunContext` and unused `_args` are dropped from method signatures (TS method bivariance allows narrower-arity overrides).

**Migration:**
- Tools — change `handle(): Promise<ToolResult<T>>` to `handle(): Promise<ToolEnvelope<T>>`. Same shape, new name.
- Workflows — drop `result.data!` / `result.metadata!` non-null assertions; the new `ToolResult` makes both non-optional. Drop `as LlmResultMeta` casts on `result.metadata`.
- Interceptors and quota calculators — `intercept(ctx, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope>`. `ToolQuotaCalculator.calculateQuotaUsage(ctx, result: ToolEnvelope)`.
- Structured output — pass a Zod schema to `outputSchema` instead of `toJSONSchema(Schema)`. Drop `validate: 'skip'` on the subsequent `documentStore.save()`.
