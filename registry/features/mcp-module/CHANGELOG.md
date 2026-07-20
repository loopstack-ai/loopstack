# @loopstack/mcp-module

## 0.3.6

### Patch Changes

- Updated dependencies [[`2f37cea`](https://github.com/loopstack-ai/loopstack/commit/2f37ceac3d13380b7e25ff5b8e57e11b0b598897), [`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841)]:
  - @loopstack/core@0.37.0
  - @loopstack/common@0.37.0

## 0.3.5

### Patch Changes

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `BaseWorkflow` is now single-generic — `BaseWorkflow<TArgs>`. The unused `_TState` second generic has been removed; state is typed per-transition on the `state` parameter. Author convention for typing `ctx.args` is now `ctx: RunContext<FooArgs>` (derived from a `type FooArgs = z.infer<typeof FooSchema>` alias), removing the previously-required `const args = ctx.args as { ... }` cast. All examples, registry workflows, and docs updated.

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

## 0.3.4

### Patch Changes

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/core@0.35.0

## 0.3.3

### Patch Changes

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0
  - @loopstack/core@0.34.0

## 0.3.2

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/core@0.33.0

## 0.3.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies to devDependencies + peerDependencies

- Updated dependencies [[`228d08b`](https://github.com/loopstack-ai/loopstack/commit/228d08b807915ecfa6ef8275714500750e797036), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/core@0.32.3
  - @loopstack/common@0.32.3

## 0.3.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/common@0.32.0
  - @loopstack/core@0.32.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0

## 0.2.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to ESM and switch test framework from Jest to Vitest

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0
