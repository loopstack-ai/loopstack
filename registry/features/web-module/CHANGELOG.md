# @loopstack/web-module

## 0.4.8

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.39.0
  - @loopstack/claude-module@0.26.1

## 0.4.7

### Patch Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd) Thanks [@jakobklippel](https://github.com/jakobklippel)! - All tools declare `resultSchema` result contracts: every `@Tool` class ships a strict Zod schema describing its success result, exported alongside the result type. Results are validated by the tool pipeline; replayed test fixtures are held to the same contract as live results.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Every registry tool declares its effect classification via `@Tool({ effects })`: `'none'` for reads, searches, computations, and LLM generation; `'external'` for calls that write outside the run (GitHub/Google mutations, git repository writes, remote command execution and file writes, sandbox mutations, OAuth token exchange, MCP tool invocation).

- Updated dependencies [[`fdfa5b0`](https://github.com/loopstack-ai/loopstack/commit/fdfa5b0b0f9e6617679d4889393876c2b5342d98), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f), [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4), [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd)]:
  - @loopstack/claude-module@0.26.0
  - @loopstack/common@0.38.0

## 0.4.6

### Patch Changes

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`338ca4c`](https://github.com/loopstack-ai/loopstack/commit/338ca4ceabcb4746077e3496f4ea7a7425a29387) Thanks [@jakobklippel](https://github.com/jakobklippel)! - READMEs gain the standard installation section (install command, verified module import, required env keys) — the registry-wide convention that replaces a `loopstack add` installer.

- Updated dependencies [[`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841), [`338ca4c`](https://github.com/loopstack-ai/loopstack/commit/338ca4ceabcb4746077e3496f4ea7a7425a29387)]:
  - @loopstack/common@0.37.0
  - @loopstack/claude-module@0.25.6

## 0.4.5

### Patch Changes

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

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/common@0.36.0
  - @loopstack/claude-module@0.25.5

## 0.4.4

### Patch Changes

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/claude-module@0.25.4

## 0.4.3

### Patch Changes

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0
  - @loopstack/claude-module@0.25.3

## 0.4.2

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b), [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/claude-module@0.25.2

## 0.4.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies to devDependencies + peerDependencies

- Updated dependencies [[`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/claude-module@0.25.1
  - @loopstack/common@0.32.3

## 0.4.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/claude-module@0.25.0
  - @loopstack/common@0.32.0

## 0.3.1

### Patch Changes

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1), [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0
  - @loopstack/claude-module@0.24.1

## 0.3.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/claude-module@0.24.0

## 0.2.4

### Patch Changes

- [#143](https://github.com/loopstack-ai/loopstack/pull/143) [`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3) Thanks [@github-actions](https://github.com/apps/github-actions)! - Adapt tools and examples to LLM provider registry; fix optional tool args and call signatures

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0
  - @loopstack/claude-module@0.23.0

## 0.2.3

### Patch Changes

- [`f61e3e1`](https://github.com/loopstack-ai/loopstack/commit/f61e3e1ecd1670515d60148c75959043e64a23f9) Thanks [@TobeyTG](https://github.com/TobeyTG)! - test release

## 0.2.2

### Patch Changes

- [`bab283d`](https://github.com/loopstack-ai/loopstack/commit/bab283dc2891c7e61eb555b683cc416635218b55) Thanks [@TobeyTG](https://github.com/TobeyTG)! - test release

## 0.2.1

### Patch Changes

- [`437cc0b`](https://github.com/loopstack-ai/loopstack/commit/437cc0b12243f1df1eae97cd3d8fa1f91b0a5254) Thanks [@TobeyTG](https://github.com/TobeyTG)! - test release

## 0.2.0

### Minor Changes

- [#137](https://github.com/loopstack-ai/loopstack/pull/137) [`b661d41`](https://github.com/loopstack-ai/loopstack/commit/b661d41279a54936f7c97ce37f4f9b784a4cb50e) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Web Fetch Feature
