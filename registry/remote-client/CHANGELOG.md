# @loopstack/remote-client

## 0.29.2

### Patch Changes

- Updated dependencies [[`2ea921f`](https://github.com/loopstack-ai/loopstack/commit/2ea921f59e64f3aa6208ac5e429f085725865522), [`e194666`](https://github.com/loopstack-ai/loopstack/commit/e194666b8cada794df5f430e263b3b67714be6b2), [`c4639e8`](https://github.com/loopstack-ai/loopstack/commit/c4639e8ca6d7fd4f423b4befb160890d1b52e20c)]:
  - @loopstack/common@0.45.0
  - @loopstack/core@0.45.0
  - @loopstack/secrets@0.30.0

## 0.29.1

### Patch Changes

- [#425](https://github.com/loopstack-ai/loopstack/pull/425) [`a6c809c`](https://github.com/loopstack-ai/loopstack/commit/a6c809ca6a0d23b89116235b0b66e200002c819a) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Packages declare the packages their type-only imports use too, because those imports end up in the published `.d.ts`
  files.
  - `@loopstack/api`: optional peer dependency `express`, whose `Request` type the SSE controller uses.
  - `@loopstack/auth`: optional peer dependency `express`, whose `Request` and `Response` types the auth controller and
    strategies use.
  - `@loopstack/loopstack-module`: the `cors` option takes its type from `@loopstack/api`.
  - `@loopstack/oauth-module`: optional peer dependency `express`, whose `Response` type the OAuth callback controller
    uses.
  - `@loopstack/remote-client`: depends on `@loopstack/contracts`, whose types its environment config uses.

- Updated dependencies [[`e0552a8`](https://github.com/loopstack-ai/loopstack/commit/e0552a8561926988c3926fe125ab7633c7eea0f3)]:
  - @loopstack/common@0.44.1
  - @loopstack/core@0.44.1

## 0.29.0

### Minor Changes

- [#353](https://github.com/loopstack-ai/loopstack/pull/353) [`1653b4e`](https://github.com/loopstack-ai/loopstack/commit/1653b4ecdedba892f08f58b75f5e8c63bcc155bf) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Remove `RemoteClient.gitClone`.

  The method sent `POST /git/clone`, a route `@loopstack/remote-server` does not serve, so every call ended in a 404. `RemoteClient` now exposes only git operations the remote server implements; to clone a repository, run
  `git clone` through `executeCommand`.

- [#402](https://github.com/loopstack-ai/loopstack/pull/402) [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Store every `created_at` / `updated_at` column as `timestamptz`, so timestamps are correct regardless of the
  timezones Node and Postgres run in.

  On the first start after upgrading, schema synchronization recreates these columns: existing rows' created and
  updated times are set to the upgrade time. Hosts that manage the schema themselves (`reuseExistingConnection`)
  change the column types to `timestamptz` on their side.

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

- [#372](https://github.com/loopstack-ai/loopstack/pull/372) [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204) Thanks [@jakobklippel](https://github.com/jakobklippel)! - A keyed save is placed at the end by default; `position: 'keep'` updates in place.

  Saving again under a `key` writes a new revision and invalidates the previous ones. The new `position` save
  option decides where it sits in the workflow's document list:
  - `'end'` (default): appended, like any new document. A card shown again after more work has happened — a
    decision gate re-presented after a reply — sits below that work, at the bottom where the user is.
  - `'keep'`: in the place of the revision it supersedes, for an entry that changes over time (status
    tickers, streamed messages, terminal output, form state, sub-workflow links).

  Tool document declarations accept `position` too. The sub-workflow link document, the bash tool's live
  output, the OAuth prompt, the ask-user question and the examples' status and form documents update in
  place. The Studio run view draws nothing at the place a revision moved away from.

- Updated dependencies [[`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`0c73301`](https://github.com/loopstack-ai/loopstack/commit/0c73301b72f7ff84fe622710543965d9e51f2855), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`e3c016e`](https://github.com/loopstack-ai/loopstack/commit/e3c016e73ed24178ec0a73b660fb496a787b3afe), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`e683f2e`](https://github.com/loopstack-ai/loopstack/commit/e683f2e77230c0f9b71735d78155042c6ea18d37), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9)]:
  - @loopstack/common@0.44.0
  - @loopstack/core@0.44.0
  - @loopstack/secrets-module@0.29.0

## 0.28.3

### Patch Changes

- Updated dependencies [[`fde95c4`](https://github.com/loopstack-ai/loopstack/commit/fde95c4d1e326b7ca9257b5d2c7f1d46565f4a0f)]:
  - @loopstack/core@0.43.0
  - @loopstack/secrets-module@0.28.2

## 0.28.2

### Patch Changes

- Updated dependencies [[`686e121`](https://github.com/loopstack-ai/loopstack/commit/686e121704c2cbdf24bd21139121bd3c92dbc97d), [`6436004`](https://github.com/loopstack-ai/loopstack/commit/6436004c0c161d836e5ff416d39926f913fbbc8e), [`341aa7f`](https://github.com/loopstack-ai/loopstack/commit/341aa7fb85e437509a100b3af7e11e015626a22d)]:
  - @loopstack/common@0.42.0
  - @loopstack/core@0.42.0
  - @loopstack/secrets-module@0.28.1

## 0.28.1

### Patch Changes

- Updated dependencies [[`74021f0`](https://github.com/loopstack-ai/loopstack/commit/74021f0af70e10c593d76218b985b208ac3817b3)]:
  - @loopstack/secrets-module@0.28.0

## 0.28.0

### Minor Changes

- [#253](https://github.com/loopstack-ai/loopstack/pull/253) [`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Live workflow preview in Studio. The preview panel now follows a running app's dynamic connection URL and only lists environments that are actually running: `WorkspaceEnvironmentDto` exposes `status`, `EnvironmentService.markRunning` records the app URL as `connectionUrl` (and no longer defaults it to the agent URL) while `markStopped` clears it. A new `environment.updated` workspace event — dispatched by `EnvironmentService` and the environment controller — invalidates the workspace-environments query via the live event stream, so the panel updates to the new URL (and drops torn-down slots) without a page reload.

- [#253](https://github.com/loopstack-ai/loopstack/pull/253) [`bb3d871`](https://github.com/loopstack-ai/loopstack/commit/bb3d8714c808d414f1401356934c6887199eec32) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add `RemoteClient.purgeWorkspace(connectionUrl, workspaceRoot?)`.

  Deletes everything under the workspace root from inside the container (via the exec endpoint, as the
  container user), keeping the mount point. Use it to reclaim a workspace's data without a host-side `rm` —
  it removes container-created files a non-root host process couldn't and can't touch the host filesystem.

### Patch Changes

- Updated dependencies [[`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5), [`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5), [`300165b`](https://github.com/loopstack-ai/loopstack/commit/300165b5f158c916d07da9ada867cdeb69111aab)]:
  - @loopstack/core@0.41.0
  - @loopstack/secrets-module@0.27.0
  - @loopstack/common@0.41.0

## 0.27.0

### Minor Changes

- [#249](https://github.com/loopstack-ai/loopstack/pull/249) [`6db1211`](https://github.com/loopstack-ai/loopstack/commit/6db1211737605e14bfd7bd9a0f5a64a978052686) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Environment-specific Studio features with a slot selector

  Workspace environments now carry a `status` (`running` / `stopped`) and can be targeted per slot:
  - `EnvironmentService` gains `markRunning` / `markStopped` (upsert + toggle a slot instead of delete),
    and `resolveAgentUrl` prefers a running slot so a stopped one no longer shadows a live one.
  - The file-explorer and git REST endpoints accept an optional `slotId` to target a specific environment.
  - Studio adds an environment selector: file-explorer and git panels follow the chosen (running)
    environment — defaulting to and tracking the live one — instead of always the first.

- [#249](https://github.com/loopstack-ai/loopstack/pull/249) [`a454c6b`](https://github.com/loopstack-ai/loopstack/commit/a454c6bd897af6be781206df98a6ef32f0e1015c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Streamed command execution over `RemoteClient`

  Long-running remote commands (clone / install / build / app start) can now stream their output live
  instead of blocking until they finish:
  - `RemoteClient.startExec` / `execStatus` / `readExecLog` / `killExec` are low-level primitives over the
    remote's append-only, offset-polled command log.
  - `RemoteClient.streamCommand(url, { command, onChunk, signal, timeout, pollMs })` drives the poll loop:
    it hands each new slice of merged stdout+stderr to `onChunk` as it arrives and resolves with the exit
    code and full output. Aborting `signal` kills the remote command; a timed-out command resolves with
    exit code `124`.

  The `bash` tool now streams its output live into a document as the command runs. Its result shape is
  merged accordingly: `{ output, exitCode }` (previously `{ stdout, stderr, exitCode }`) — a single
  chronological stream, which is how a terminal reads.

### Patch Changes

- Updated dependencies []:
  - @loopstack/secrets-module@0.26.2
  - @loopstack/common@0.39.0

## 0.26.2

### Patch Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd) Thanks [@jakobklippel](https://github.com/jakobklippel)! - All tools declare `resultSchema` result contracts: every `@Tool` class ships a strict Zod schema describing its success result, exported alongside the result type. Results are validated by the tool pipeline; replayed test fixtures are held to the same contract as live results.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Every registry tool declares its effect classification via `@Tool({ effects })`: `'none'` for reads, searches, computations, and LLM generation; `'external'` for calls that write outside the run (GitHub/Google mutations, git repository writes, remote command execution and file writes, sandbox mutations, OAuth token exchange, MCP tool invocation).

- Updated dependencies [[`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd), [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4), [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd)]:
  - @loopstack/common@0.38.0
  - @loopstack/secrets-module@0.26.1

## 0.26.1

### Patch Changes

- Updated dependencies [[`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`207cf17`](https://github.com/loopstack-ai/loopstack/commit/207cf17e11f6a06bc7565543c43f2f909707d349), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841)]:
  - @loopstack/common@0.37.0
  - @loopstack/secrets-module@0.26.0

## 0.26.0

### Minor Changes

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add `RemoteClient.ping(connectionUrl)` (calls `GET /health`) and `EnvironmentService.assertReachable(slotId?)`, a pre-flight check that resolves the agent URL and verifies the remote agent responds. Throws a user-readable error with the slot name and underlying cause when the slot has no environment connected or the agent does not answer. Use at the start of workflows that depend on remote-client tools (grep, glob, read, bash, …) to fail fast with actionable messages instead of cryptic network errors mid-run.

  `EnvironmentService`'s "no environment with agent URL found" error now names the slot ("slot \"sandbox\"" vs. "any slot") and tells the user to connect an environment in their app.

  `EnvironmentConfigService` logs the resolved available environment types and slot ids at bootstrap so misconfigurations are visible without enabling debug logging.

  Internally, `RemoteClientModule.forFeature()` now returns a separate `RemoteClientFeatureModule` host instead of `RemoteClientModule` itself. The previous form transitively re-imported the `@Global` root and would shadow the `forRoot()` config with defaults whenever a feature module was loaded. No public-API impact.

### Patch Changes

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
  - @loopstack/secrets-module@0.25.5

## 0.25.4

### Patch Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Allow bare `RemoteClientModule` import without `forRoot()`. The module's static `@Module` decorator now wires a global root module, so importing the class directly registers `RemoteClient`, `EnvironmentService`, `EnvironmentConfigService`, `ENVIRONMENT_CONFIG`, and the file/exec tools with default config. `forRoot(options)` and `forFeature(options)` are unchanged.

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/secrets-module@0.25.4

## 0.25.3

### Patch Changes

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Allow bare `RemoteClientModule` import without `forRoot()`. The module's static `@Module` decorator now wires a global root module, so importing the class directly registers `RemoteClient`, `EnvironmentService`, `EnvironmentConfigService`, `ENVIRONMENT_CONFIG`, and the file/exec tools with default config. `forRoot(options)` and `forFeature(options)` are unchanged.

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0
  - @loopstack/secrets-module@0.25.3

## 0.25.2

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b), [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/secrets-module@0.25.2

## 0.25.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies to devDependencies + peerDependencies

- Updated dependencies [[`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/secrets-module@0.25.1
  - @loopstack/common@0.32.3

## 0.25.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/secrets-module@0.25.0
  - @loopstack/common@0.32.0

## 0.24.1

### Patch Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Adapt to new FrameworkContext shape (ctx.run, ctx.app, ctx.workflow)

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0
  - @loopstack/secrets-module@0.24.1

## 0.24.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/secrets-module@0.24.0

## 0.23.4

### Patch Changes

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3), [`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0
  - @loopstack/secrets-module@0.23.3

## 0.23.3

### Patch Changes

- Updated dependencies [[`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0
  - @loopstack/secrets-module@0.23.2

## 0.23.2

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0
  - @loopstack/secrets-module@0.23.1
