# @loopstack/llm-provider-module

## 0.7.0

### Minor Changes

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, and `LlmUpdateToolResultTool` now persist their messages to the document store automatically — the assistant turn after `llmGenerateText`, and the `tool_result` user turn once all delegated tools have completed (sync or async). Two new config fields control this:
  - `save?: boolean` (default `true`) — pass `false` to opt out when you want to inspect, transform, or persist the response yourself (e.g. prefixing the text with a provider name for side-by-side comparison).
  - `meta?: Record<string, unknown>` — merged into the auto-saved document's metadata. Common use: `{ meta: { hidden: true } }` to keep a message in the LLM's conversation history while hiding it from the Studio UI.

  **Migration:** if your workflow already saves `result.data!.message` / `state.llmResult!.message` manually, drop the call — you'll otherwise persist the same document twice. Author-constructed messages (`{ role: 'user', text }`, system seeds, transformed responses) stay manual.

  All registry examples and the built-in `AgentWorkflow` / `ChatAgentWorkflow` updated to drop their manual saves. Three sync-only tool-calling workflows (`tool-call-example-workflow`, `explore-registry-package-agent`, `search-registry-agent`) had their state graphs simplified — `awaiting_tools` intermediate state, `toolsComplete` transition, and `allToolsComplete` guard are gone since they were only needed for the now-automatic save. Async workflows (with `callback: { transition: ... }`) keep that structure for callback re-entry.

  The new typed config schemas on `LlmDelegateToolCallsTool` / `LlmUpdateToolResultTool` also surface a previously-silent bug: workflows passing `{ config: { provider: 'claude' } }` to those tools (the field was never accepted; it was discarded under the prior `object` config type). Affected example call sites have been cleaned up.

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Cleanup of the `documentStore.save` options taxonomy. Three related changes:

  **1. `id` → `key` (rename).** `DocumentSaveOptions.id` is now `key`, and the underlying entity field/column moved from `messageId` / `message_id` to `key`. The option is used for non-message documents too (forms, transcripts, status docs), so the LLM-flavored name was misleading — `key` accurately names the concept (stable upsert key that invalidates the previous row in place). Synchronize mode handles the column rename; no migration shipped.

  **2. New `internal` decorator option + entity column.** `@Document({ internal: true })` marks a document type as framework plumbing. Internal documents are persisted server-side and still readable by code that queries the document store (e.g. LLM providers building conversation history), but they're excluded from REST API responses — Studio never sees them. The filter is applied at the API boundary (`DocumentApiService.findAll` / `findOneById`); the repository itself stays unfiltered so server-side callers compose their own queries. `StaticDocumentMeta.hidden` is gone — it was the half-measure this replaces.

  **3. New `LlmContextDocument` type.** Symmetric with `LlmMessageDocument` (`{ role: 'user' | 'assistant', text }`) but declared `@Document({ internal: true, tags: ['message'] })`. The `'message'` tag keeps it in the LLM provider's conversation-history gather; `internal: true` keeps it out of Studio. Replaces the prior `{ meta: { hidden: true } }` flag on `LlmMessageDocument` saves — 9 call sites across `@loopstack/agent`, sandbox/app-builder, and registry examples migrated to the new type.

  **Migration:**

  ```ts
  // before
  await this.documentStore.save(Doc, content, { id: 'status' });
  await this.documentStore.save(LlmMessageDocument, { role: 'user', text }, { meta: { hidden: true } });

  // after
  await this.documentStore.save(Doc, content, { key: 'status' });
  await this.documentStore.save(LlmContextDocument, { role: 'user', text });
  ```

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Split tool result types and tighten the public call surface.
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

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `LlmDelegateToolCallsToolSchema.callback` is now required. The previous synchronous loop pattern (no callback, guard-only) silently hung the moment any tool returned `pending: true` — typical for sub-workflow tools and HITL tools. Requiring `callback` at the schema level forces every caller to wire up the `wait: true` self-loop transition that handles async completions via `LlmUpdateToolResultTool`. The `tool-call-example-workflow` example, which demonstrated the unsafe synchronous pattern, has been removed; use `@loopstack/agent` (via `AgentWorkflow.run()`) for standard tool calling, or see `delegate-error-example-workflow` as a reference for hand-rolled loops with custom error handling.

### Patch Changes

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Relative `widget:` paths on `@Workflow` / `@Tool` / `@Document` resolve against the class's source directory at decorator-evaluation time (e.g. `widget: './chat.ui.yaml'`). The `Block()` decorator captures the caller file via a new `getCallerFile()` helper and stores the directory under `BLOCK_DIR_METADATA_KEY`. `BaseTool` exposes the `render` Handlebars renderer alongside `BaseWorkflow`. Example workflow render call sites use `path.join(__dirname, 'templates', 'foo.md')`. Registry READMEs and docs swept; `uiConfig:` references in registry READMEs corrected to `widget:`. Resolves todo.md [#9](https://github.com/loopstack-ai/loopstack/issues/9).

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Failure-handling on `@Transition` is now expressed as flat fields instead of a nested `retry` object, and the framework treats sync throws, timeouts, and sub-workflow failure callbacks under a single decision tree (auto-retry → `errorPlace` → manual retry).

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

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Unify the `wait: true` payload shape. Every wait transition now receives the same envelope, `TransitionInput<TData, TMeta>`, regardless of whether the resume came from a sub-workflow completion or a frontend / API trigger:

  ```ts
  interface TransitionInput<TData = unknown, TMeta = unknown> {
    workflowId: string;
    status: 'completed' | 'failed' | 'canceled';
    hasError: boolean;
    errorMessage: string | null;
    data: TData;
    meta?: TMeta;
  }
  ```

  The `schema:` option on `@Transition({ wait: true })` now describes **only `data`** — the framework constructs the surrounding envelope. Authors no longer extend a base callback schema; they declare the data shape they expect and receive the full envelope on the transition method. The frontend can now signal `status: 'failed' | 'canceled'` + `errorMessage` via the `/processor/run/:workflowId` API so user-driven HITL flows can model "user declined" alongside sub-workflow failures using the same `input.hasError` branch.

  **Breaking changes:**
  - `CallbackSchema` is removed from `@loopstack/common`. Replace `schema: CallbackSchema.extend({ data: z.object({ ... }) })` with `schema: z.object({ ... })` and type the parameter as `input: TransitionInput<TData>`.
  - `FanOutCallbackSchema` / `FanOutCallbackPayload` are removed from `@loopstack/core` and replaced with `FanOutResultSchema` (the inner data shape). Same for `SequenceCallbackSchema` / `SequenceCallbackPayload` → `SequenceResultSchema`.
  - Wait transitions that previously received the raw payload directly (e.g. `payload: string` for chat user-input) now receive `input: TransitionInput<string>`; access via `input.data`.
  - The orchestrator's callback envelope renames `_subscriberMetadata` → `meta`. `FanOutWorkflow` / `SequenceWorkflow` and `LlmDelegateService.updateToolResult()` now read correlation metadata from `input.meta` / `payload.meta`.

  **Migration:**

  ```ts
  // Before
  import { CallbackSchema } from '@loopstack/common';
  const AnswerCallback = CallbackSchema.extend({ data: z.object({ answer: z.string() }) });
  @Transition({ wait: true, schema: AnswerCallback })
  async onAnswer(state, payload: z.infer<typeof AnswerCallback>) {
    payload.data.answer;
    payload.hasError;
  }

  // After
  import type { TransitionInput } from '@loopstack/common';
  @Transition({ wait: true, schema: z.object({ answer: z.string() }) })
  async onAnswer(state, input: TransitionInput<{ answer: string }>) {
    input.data.answer;
    input.hasError;
  }
  ```

  All registry features, examples, and docs (including `sub-workflows.md`, `human-in-the-loop.md`, `workflows.md`, the HITL tutorial, and every registry README) have been swept to the new shape. No backwards-compatibility shim — the old `CallbackSchema` export and the `_subscriberMetadata` field are removed outright.

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/common@0.36.0
  - @loopstack/contracts@0.36.0
  - @loopstack/core@0.36.0

## 0.6.0

### Minor Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `LlmNormalizedMessage` exposes `text: string` as the plain-text projection (always populated by providers) and `blocks?: LlmContentBlock[]` as the structured form. `LlmMessageDocument` and inline `LlmMessage` args accept either field — `text` for plain content, `blocks` for structured blocks like tool results. Read `result.message.text` to get a guaranteed string; iterate `result.message.blocks` to inspect tool calls, thinking output, or render block-by-block.

### Patch Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Allow bare `LlmProviderModule` import without `forRoot({})`. The module's static `@Module` decorator now wires the global root, so importing the class directly registers the provider registry, helper services, and tools with default config. `forRoot(config)` and `forFeature(config)` are unchanged.

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `MessageDocument`'s field is renamed `content: string` → `text?: string` so it lines up with `LlmMessageDocument`, and its default tag changes from `['message']` to `['ui-message']`. The tag change means a `MessageDocument` is no longer picked up by LLM history collection (`messagesSearchTag` defaults to `'message'`) — plain UI bubbles stop leaking into the conversation context. `LlmMessageDocument` now extends `MessageDocument` for a shared base; its exposed fields (`role`, `text`, `blocks`, `stopReason`, `id`) are unchanged. To restore the old behaviour and feed a `MessageDocument` into LLM history, save it with explicit `tags: ['message']`.

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/core@0.35.0
  - @loopstack/contracts@0.35.0

## 0.5.0

### Minor Changes

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `LlmNormalizedMessage` exposes `text: string` as the plain-text projection (always populated by providers) and `blocks?: LlmContentBlock[]` as the structured form. `LlmMessageDocument` and inline `LlmMessage` args accept either field — `text` for plain content, `blocks` for structured blocks like tool results. Read `result.message.text` to get a guaranteed string; iterate `result.message.blocks` to inspect tool calls, thinking output, or render block-by-block.

### Patch Changes

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Allow bare `LlmProviderModule` import without `forRoot({})`. The module's static `@Module` decorator now wires the global root, so importing the class directly registers the provider registry, helper services, and tools with default config. `forRoot(config)` and `forFeature(config)` are unchanged.

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `MessageDocument`'s field is renamed `content: string` → `text?: string` so it lines up with `LlmMessageDocument`, and its default tag changes from `['message']` to `['ui-message']`. The tag change means a `MessageDocument` is no longer picked up by LLM history collection (`messagesSearchTag` defaults to `'message'`) — plain UI bubbles stop leaking into the conversation context. `LlmMessageDocument` now extends `MessageDocument` for a shared base; its exposed fields (`role`, `text`, `blocks`, `stopReason`, `id`) are unchanged. To restore the old behaviour and feed a `MessageDocument` into LLM history, save it with explicit `tags: ['message']`.

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0
  - @loopstack/contracts@0.34.0
  - @loopstack/core@0.34.0

## 0.4.2

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/core@0.33.0

## 0.4.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies to devDependencies + peerDependencies

- Updated dependencies [[`228d08b`](https://github.com/loopstack-ai/loopstack/commit/228d08b807915ecfa6ef8275714500750e797036), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/core@0.32.3
  - @loopstack/contracts@0.32.3
  - @loopstack/common@0.32.3

## 0.4.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/contracts@0.32.0
  - @loopstack/common@0.32.0

## 0.3.1

### Patch Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Adapt to new FrameworkContext shape (ctx.run, ctx.app, ctx.workflow)

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/contracts@0.31.0
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0

## 0.3.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/contracts@0.30.0

## 0.2.0

### Minor Changes

- [#143](https://github.com/loopstack-ai/loopstack/pull/143) [`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3) Thanks [@github-actions](https://github.com/apps/github-actions)! - Add provider-agnostic LLM registry with adapter tools, tool/workflow config system, and multi-provider support (Claude + OpenAI)

### Patch Changes

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/contracts@0.29.0
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0
