# @loopstack/core-ui-module

## 0.5.5

### Patch Changes

- [#407](https://github.com/loopstack-ai/loopstack/pull/407) [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Every package declares the packages its code imports, so it loads under installs that don't hoist dependencies
  (npm `--install-strategy=nested`, pnpm `hoist=false`, Yarn PnP).
  - `@loopstack/common`: peer dependencies `@nestjs/common` and `typeorm`.
  - `@loopstack/core`: depends on `@loopstack/contracts`; peer dependencies `typeorm`, `@nestjs/typeorm` and
    `reflect-metadata`.
  - `@loopstack/api`: peer dependencies `typeorm`, `@nestjs/typeorm` and `zod`.
  - `@loopstack/auth`: peer dependencies `typeorm` and `@nestjs/typeorm`.
  - `@loopstack/testing`: peer dependency `typeorm`.
  - `@loopstack/google-workspace-module`: depends on `@loopstack/common`; peer dependency `@nestjs/common`.
  - `@loopstack/github-module`: peer dependency `@nestjs/common`.
  - `@loopstack/oauth-module`, `@loopstack/openai-module`, `@loopstack/llm-provider-module`: peer dependency
    `@nestjs/common`.
  - `@loopstack/remote-client`: peer dependencies `@nestjs/core`, `class-transformer` and `class-validator`.
  - `@loopstack/code-agent`: depends on `@loopstack/llm-provider-module`, whose types its module config uses.
  - `@loopstack/git-examples`: depends on `@loopstack/remote-client`.

- [#394](https://github.com/loopstack-ai/loopstack/pull/394) [`6b06ebc`](https://github.com/loopstack-ai/loopstack/commit/6b06ebc27c2bf9a4897e505c994cdc4974669f76) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Gmail and Drive tools escape what they put into mail headers, Drive queries and request URLs, and return complete, correctly typed results.
  - `gmail_send_message` rejects line breaks in `to`, `cc`, `bcc` and `subject` with a validation error, and
    sends non-ASCII subjects as RFC 2047 encoded-words.
  - `gmail_reply_to_message` keeps header values copied from the original message on one line, extends the
    original `References` chain with the parent Message-ID, and recognises an existing `Re:` prefix in any
    letter case.
  - `gmail_get_message` with `format: 'minimal'` returns the message with empty headers, body and attachments.
  - `google_drive_list_files` escapes quotes and backslashes in `folderId`.
  - `google_drive_download_file` applies `exportMimeType` to Google Docs/Sheets/Slides only; other files are
    returned as stored, with their own mime type.
  - `google_drive_upload_file` returns the created file's `webViewLink`.
  - File and message ids are URL-encoded in request paths.

- [#420](https://github.com/loopstack-ai/loopstack/pull/420) [`0c73301`](https://github.com/loopstack-ai/loopstack/commit/0c73301b72f7ff84fe622710543965d9e51f2855) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `@nestjs/config` is a peer dependency (`^4.0.0 || ^12.0.0`), so every package injects the app's own `ConfigService`.
  A NestJS 11 app on `@nestjs/config` 4.x now boots with a single copy of `@nestjs/config`, the one its
  `ConfigModule.forRoot()` registers.

- [#401](https://github.com/loopstack-ai/loopstack/pull/401) [`04b54cf`](https://github.com/loopstack-ai/loopstack/commit/04b54cf47024fdfe5e5d86fdfa1930c919791f13) Thanks [@jakobklippel](https://github.com/jakobklippel)! - OAuth tokens stay valid with providers that rotate refresh tokens or omit `expires_in`.
  - `@loopstack/oauth-module`: when `OAuthTokenStore` refreshes a token, it stores the refresh token and scope the
    provider returned, falling back to the stored ones when the response omits them.
  - `@loopstack/oauth-module`: `OAuthTokenSet.expiresIn` and `StoredTokens.expiresAt` are optional. A token set without
    `expiresIn` is stored without an expiry, treated as valid until the provider rejects it, and kept in Redis for 30
    days.
  - `@loopstack/google-workspace-module`: `GoogleWorkspaceOAuthProvider.refreshToken()` returns the `refresh_token` from
    Google's refresh response.

- Updated dependencies [[`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`aab81a6`](https://github.com/loopstack-ai/loopstack/commit/aab81a67c5f8fd6b301b5cd678aa0dee87501ace), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`04b54cf`](https://github.com/loopstack-ai/loopstack/commit/04b54cf47024fdfe5e5d86fdfa1930c919791f13), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9)]:
  - @loopstack/common@0.44.0
  - @loopstack/oauth-module@0.5.6

## 0.5.4

### Patch Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd) Thanks [@jakobklippel](https://github.com/jakobklippel)! - All tools declare `resultSchema` result contracts: every `@Tool` class ships a strict Zod schema describing its success result, exported alongside the result type. Results are validated by the tool pipeline; replayed test fixtures are held to the same contract as live results.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Every registry tool declares its effect classification via `@Tool({ effects })`: `'none'` for reads, searches, computations, and LLM generation; `'external'` for calls that write outside the run (GitHub/Google mutations, git repository writes, remote command execution and file writes, sandbox mutations, OAuth token exchange, MCP tool invocation).

- Updated dependencies [[`2b1a0b8`](https://github.com/loopstack-ai/loopstack/commit/2b1a0b8f7d7f92910c1708294857b8bd9c9ef6a4), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72)]:
  - @loopstack/oauth-module@0.5.0

## 0.5.3

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

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/oauth-module@0.4.5

## 0.5.2

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/oauth-module@0.4.2

## 0.5.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies to devDependencies + peerDependencies

- Updated dependencies [[`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/oauth-module@0.4.1

## 0.5.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/oauth-module@0.4.0

## 0.4.1

### Patch Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Adapt to new FrameworkContext shape (ctx.run, ctx.app, ctx.workflow)

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/oauth-module@0.3.1

## 0.4.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/oauth-module@0.3.0

## 0.3.3

### Patch Changes

- [#124](https://github.com/loopstack-ai/loopstack/pull/124) [`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Revert deps

- Updated dependencies [[`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22)]:
  - @loopstack/oauth-module@0.2.3

## 0.3.2

### Patch Changes

- [#121](https://github.com/loopstack-ai/loopstack/pull/121) [`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update dependencies

- Updated dependencies [[`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f)]:
  - @loopstack/oauth-module@0.2.2

## 0.3.1

### Patch Changes

- [#118](https://github.com/loopstack-ai/loopstack/pull/118) [`4581a57`](https://github.com/loopstack-ai/loopstack/commit/4581a57fd714222869af433a4de9957ba7ad8805) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update readme

- Updated dependencies [[`4581a57`](https://github.com/loopstack-ai/loopstack/commit/4581a57fd714222869af433a4de9957ba7ad8805)]:
  - @loopstack/oauth-module@0.2.1

## 0.3.0

### Minor Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to workflow core v2

### Patch Changes

- Updated dependencies [[`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154)]:
  - @loopstack/oauth-module@0.2.0

## 0.2.0

### Minor Changes

- [#106](https://github.com/loopstack-ai/loopstack/pull/106) [`ba11102`](https://github.com/loopstack-ai/loopstack/commit/ba11102b8b79d0e7875c6b773b020ea0d5644d31) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add tools for calendar, drive and gmail

## 0.1.3

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1)]:
  - @loopstack/oauth-module@0.1.3

## 0.1.3-rc.0

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1)]:
  - @loopstack/oauth-module@0.1.3-rc.0

## 0.1.2

### Patch Changes

- [#77](https://github.com/loopstack-ai/loopstack/pull/77) [`e2e993b`](https://github.com/loopstack-ai/loopstack/commit/e2e993b9c970683257cae79526e5f86ac5169503) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Create dependent packages auto configuration through cli

- Updated dependencies [[`e2e993b`](https://github.com/loopstack-ai/loopstack/commit/e2e993b9c970683257cae79526e5f86ac5169503)]:
  - @loopstack/oauth-module@0.1.2

## 0.1.1

### Patch Changes

- [#73](https://github.com/loopstack-ai/loopstack/pull/73) [`fd4eb8d`](https://github.com/loopstack-ai/loopstack/commit/fd4eb8d09f510c37fe931484ae58a1b40715cf65) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add standardized install mode handling for using loopstack cli

- Updated dependencies [[`fd4eb8d`](https://github.com/loopstack-ai/loopstack/commit/fd4eb8d09f510c37fe931484ae58a1b40715cf65)]:
  - @loopstack/oauth-module@0.1.1

## 0.20.0

### Minor Changes

- [#58](https://github.com/loopstack-ai/loopstack/pull/58) [`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Implement property decorators to replace class decorators With\*

### Patch Changes

- Updated dependencies [[`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570)]:
  - @loopstack/contracts@0.20.0
  - @loopstack/common@0.20.0
  - @loopstack/core@0.20.0

## 0.19.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8), [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/contracts@0.19.0
  - @loopstack/common@0.19.0
  - @loopstack/core@0.19.0

## 0.19.0-rc.1

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/contracts@0.19.0-rc.1
  - @loopstack/common@0.19.0-rc.1
  - @loopstack/core@0.19.0-rc.1

## 0.19.0-rc.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8)]:
  - @loopstack/contracts@0.19.0-rc.0
  - @loopstack/common@0.19.0-rc.0
  - @loopstack/core@0.19.0-rc.0

## 0.18.1

### Patch Changes

- [#36](https://github.com/loopstack-ai/loopstack/pull/36) [`1af9cd4`](https://github.com/loopstack-ai/loopstack/commit/1af9cd4edb37b60e3df677ba450ad22a936f447d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add loopstack-module config and update readme files

## 0.18.0

### Minor Changes

- [#10](https://github.com/loopstack-ai/loopstack/pull/10) [`4ee0af1`](https://github.com/loopstack-ai/loopstack/commit/4ee0af1536e7802eb9d69a788c10184e3c5a7a11) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Added Core Ui Module to monorepo

### Patch Changes

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix various bugs, Replace zod to schema package, fic cli npm install

- Updated dependencies [[`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101), [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/core@0.18.0
  - @loopstack/common@0.18.0
  - @loopstack/contracts@0.18.0

## 0.18.0-rc.1

### Patch Changes

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix various bugs, Replace zod to schema package, fic cli npm install

- Updated dependencies [[`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101)]:
  - @loopstack/core@0.18.0-rc.2
  - @loopstack/contracts@0.18.0-rc.2
  - @loopstack/common@0.18.0-rc.2

## 0.18.0-rc.0

### Minor Changes

- [#10](https://github.com/loopstack-ai/loopstack/pull/10) [`4ee0af1`](https://github.com/loopstack-ai/loopstack/commit/4ee0af1536e7802eb9d69a788c10184e3c5a7a11) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Added Core Ui Module to monorepo
