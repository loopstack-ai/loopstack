# @loopstack/hitl

## 0.4.5

### Patch Changes

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

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix README documentation for `AskUserWorkflow.run()` and `ConfirmUserWorkflow.run()` return values — split the immediate `QueueResult` (`{ workflowId }`) from the callback payload (`{ answer }` / `{ confirmed, markdown }`) and link to the sub-workflow callback example.

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Relative `widget:` paths on `@Workflow` / `@Tool` / `@Document` resolve against the class's source directory at decorator-evaluation time (e.g. `widget: './chat.ui.yaml'`). The `Block()` decorator captures the caller file via a new `getCallerFile()` helper and stores the directory under `BLOCK_DIR_METADATA_KEY`. `BaseTool` exposes the `render` Handlebars renderer alongside `BaseWorkflow`. Example workflow render call sites use `path.join(__dirname, 'templates', 'foo.md')`. Registry READMEs and docs swept; `uiConfig:` references in registry READMEs corrected to `widget:`. Resolves todo.md [#9](https://github.com/loopstack-ai/loopstack/issues/9).

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

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Transitions return nothing and mutate workflow state and result via four setter methods on `BaseWorkflow`:

  ```ts
  this.assignState(partial); // shallow merge into state
  this.setState(full); // replace state
  this.assignResult(partial); // shallow merge into the published result
  this.setResult(full); // replace the published result
  ```

  Setters are immediately visible to subsequent code in the same transition and are committed atomically with the existing per-transition DB transaction; on transition error the draft is discarded.

  The published result (`WorkflowEntity.result`) is no longer derived from the final transition's return value — call `assignResult` / `setResult` from any transition to build it incrementally.

  `@loopstack/testing` adds a `runTransition` helper that sets up an `ExecutionScope` around a transition invocation and returns the committed `{ state, result }` draft — the canonical way to unit-test a transition without going through the full processor.

  **Breaking changes:**
  - Transition methods return nothing. The processor throws if a transition returns a non-undefined value.
  - `return { ...state, foo }`, `return state`, and `return {}` no longer drive state or result. Replace with `this.assignState({ foo })` (or delete the return for no-op patterns).
  - The `to: 'end'` "return becomes result" shortcut is removed — final transitions that previously returned a result must call `this.setResult(...)`.
  - Unit tests that invoke transitions directly must use `runTransition` from `@loopstack/testing` (or set up an `ExecutionScope` manually) — the previous "assert on the return value" pattern no longer works.

  **Migration:**

  ```ts
  // Before
  @Transition({ to: 'next' })
  async myTransition(state): Promise<MyState> {
    const result = await this.someTool.call(...);
    return { ...state, foo: result.data };
  }

  @Transition({ from: 'compute', to: 'end' })
  async done(state): Promise<MyResult> {
    return this.buildResult(state);
  }

  // After
  @Transition({ to: 'next' })
  async myTransition(state) {
    const result = await this.someTool.call(...);
    this.assignState({ foo: result.data });
  }

  @Transition({ from: 'compute', to: 'end' })
  done(state) {
    this.setResult(this.buildResult(state));
  }
  ```

  Omit the `: Promise<void>` annotation; drop `async` when the body has no `await`.

  All registry features, examples, READMEs, and docs have been swept to the setter-based form. No backwards-compatibility shim — returning a value from a transition is a runtime error.

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/common@0.36.0
  - @loopstack/core@0.36.0

## 0.4.4

### Patch Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add explicit `name` to `@Workflow()` decorators on framework-shipped workflows (`agent`, `chat_agent`, `ask_user`, `confirm_user`, `oauth`, `connect_github`, `secrets_request`). Names match the previously auto-derived snake_case identifiers, so no behavior changes for existing consumers — but the public name now lives in code instead of relying on class-name derivation, which makes it safe for downstream callers to reference these workflows by string from `FanOutWorkflow` / `SequenceWorkflow` items.

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Sub-workflow rendering is now controlled by a single `show` option on `RunOptions`, and the orchestrator auto-creates the link card so the parent's view never goes blank.

  `BaseWorkflow.run()` accepts `show?: 'inline' | 'link' | 'hidden'` (default `'inline'`) and `label?: string`. The orchestrator writes the matching `LinkDocument` into the parent's stream from `WorkflowOrchestrationService.queue()` while still inside the parent's `ExecutionScope`:
  - `'inline'` — `embed: true, expanded: true` (iframe in the parent's view). Right for HITL/OAuth/agents.
  - `'link'` — `embed: false` (status card opens in a separate window). Right for autonomous children.
  - `'hidden'` — no save. Right for fan-out / background work.

  The `status` field is removed from `LinkDocumentSchema`. The Studio `LinkCard` reads live status from `useChildWorkflows(parentId)` (already SSE-invalidated) and maps `WorkflowState` to its colored badge — there is no longer any denormalized status to keep in sync.

  All registry features, examples, and sandbox call sites drop their manual `documentStore.save(LinkDocument, …)` pairs around `subWorkflow.run()` and pass `show` + `label` on the `.run()` call instead.

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/core@0.35.0

## 0.4.3

### Patch Changes

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Sub-workflow rendering is now controlled by a single `show` option on `RunOptions`, and the orchestrator auto-creates the link card so the parent's view never goes blank.

  `BaseWorkflow.run()` accepts `show?: 'inline' | 'link' | 'hidden'` (default `'inline'`) and `label?: string`. The orchestrator writes the matching `LinkDocument` into the parent's stream from `WorkflowOrchestrationService.queue()` while still inside the parent's `ExecutionScope`:
  - `'inline'` — `embed: true, expanded: true` (iframe in the parent's view). Right for HITL/OAuth/agents.
  - `'link'` — `embed: false` (status card opens in a separate window). Right for autonomous children.
  - `'hidden'` — no save. Right for fan-out / background work.

  The `status` field is removed from `LinkDocumentSchema`. The Studio `LinkCard` reads live status from `useChildWorkflows(parentId)` (already SSE-invalidated) and maps `WorkflowState` to its colored badge — there is no longer any denormalized status to keep in sync.

  All registry features, examples, and sandbox call sites drop their manual `documentStore.save(LinkDocument, …)` pairs around `subWorkflow.run()` and pass `show` + `label` on the `.run()` call instead.

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0
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
  - @loopstack/common@0.32.3

## 0.4.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/common@0.32.0

## 0.3.1

### Patch Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Adapt to new FrameworkContext shape (ctx.run, ctx.app, ctx.workflow)

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0

## 0.3.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0

## 0.2.0

### Minor Changes

- [#137](https://github.com/loopstack-ai/loopstack/pull/137) [`4ecc33e`](https://github.com/loopstack-ai/loopstack/commit/4ecc33e9efc2ce44f9d187644acf5bbe47244718) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add AskClarification and AskForApproval tools for streamlined human-in-the-loop interactions

## 0.1.2

### Patch Changes

- Updated dependencies [[`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0

## 0.1.1

### Patch Changes

- [#132](https://github.com/loopstack-ai/loopstack/pull/132) [`3911d9e`](https://github.com/loopstack-ai/loopstack/commit/3911d9e10d47c75bc36e5391562a3ee62eb3fa31) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add human-in-the-loop module with ask-user and confirm-user workflows for interactive input

- Updated dependencies []:
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0
