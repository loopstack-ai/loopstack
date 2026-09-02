# @loopstack/testing

## 0.40.0

### Minor Changes

- [#251](https://github.com/loopstack-ai/loopstack/pull/251) [`937337c`](https://github.com/loopstack-ai/loopstack/commit/937337c8afcd5b60248c537e45403ea216ca2f8e) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Ship the framework's runtime stack as `dependencies` instead of `peerDependencies`.

  The NestJS integration modules and libraries that each package imports and
  configures internally — `@nestjs/config`, `@nestjs/event-emitter`,
  `@nestjs/bullmq`, `@nestjs/schedule`, `bullmq` (core); `@nestjs/jwt`,
  `@nestjs/microservices`, `@nestjs/passport` (auth); `@nestjs/typeorm`, `pg`,
  `typeorm` (loopstack-module); `@nestjs/config`, `@nestjs/typeorm` (testing) — are
  now regular pinned `dependencies`. Only host-owned singletons that must be a
  single shared instance (`@nestjs/common`, `@nestjs/core`,
  `@nestjs/platform-express`, `reflect-metadata`, `rxjs`, `zod`,
  `class-transformer`, `class-validator`) remain `peerDependencies`.

  This makes a fresh install resolve the complete runtime without
  `--legacy-peer-deps` and pins `typeorm` to the compatible `^0.3` range.

### Patch Changes

- Updated dependencies [[`937337c`](https://github.com/loopstack-ai/loopstack/commit/937337c8afcd5b60248c537e45403ea216ca2f8e)]:
  - @loopstack/core@0.40.0

## 0.39.0

### Patch Changes

- Updated dependencies [[`806244a`](https://github.com/loopstack-ai/loopstack/commit/806244ae2e12aa5b8ab364bd1b6e71fdb9c13972), [`6db1211`](https://github.com/loopstack-ai/loopstack/commit/6db1211737605e14bfd7bd9a0f5a64a978052686), [`a2160e4`](https://github.com/loopstack-ai/loopstack/commit/a2160e4048d8d2d8bf48c35bd64b3033bf343ac8)]:
  - @loopstack/core@0.39.0
  - @loopstack/contracts@0.39.0
  - @loopstack/common@0.39.0

## 0.38.0

### Minor Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fault injection and deterministic time for workflow tests: `failure(message?, status?)` scripts a failed/canceled sub-workflow callback as an answer — `errorPlace`/retry routing and inline `input.status === 'failed'` handling become reachable from ordinary tests, composing with `queue()`. The framework gains an injectable `Clock` (`CLOCK` token, `SystemClock` default) consumed by the transition-timeout race and trace timestamps; `runWorkflow`'s `clock` option accepts a `TestClock` (settable `now`, `advance(ms)`, `waitForScheduled()`) making transition timeouts testable without real waiting and trace timestamps reproducible.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replay fixture format v3 — config drift detection: fixture entries capture the call's validated `config` as assertion metadata alongside `args`, so a changed system prompt, model, or tool list fails the replayed test instead of silently passing against a stale fixture. Config is captured at both capture points (`ToolExecutionContext.config` for in-process recording — visible to all tool interceptors — and the `config` field on tool trace events for `loopstack runs --record`). Version 2 fixtures are rejected with a re-record message; hand-written entries that omit `config` don't assert it.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`d281a50`](https://github.com/loopstack-ai/loopstack/commit/d281a5006432194632f3c417e958740fd29108e7) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Canonical park-view rules (`@loopstack/contracts/park-view`): pure functions answering "what would a human see at this park, and what can they submit" — document visibility (`hideAtPlaces`, internal), place activity (`enableAtPlaces`), answered-ness (presence of `answer`, not truthiness), widget state (`showWhen` hides / `enabledWhen` disables), submit-transition resolution (declared∩available, else the lone available one), answerable states (waiting, paused, and failed-with-transitions), candidate evaluation and prompt selection. `TestRun.parkView()` runs these rules over the in-process run tree, so tests assert what the user would actually see — widget, question content, answer schema, default transition — including recovery prompts on runs failed at an error place.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4) Thanks [@jakobklippel](https://github.com/jakobklippel)! - In-process workflow testing: stateless runs now record their transition `history`, park-and-resume via a `statelessState` carrier (scripted HITL answers without persistence), and execute sub-workflows inline with automatic callback delivery. `@loopstack/testing` gains the `runWorkflow()` / `testTool()` / `replay()` facade with transition-scoped tool-response replay and drift warnings. Debug-mode tool-call auditing (`core_tool_call_record`) with a `GET /workflows/:id/tool-calls` endpoint and `client.workflows.toolCalls()` powers replay fixture recording.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Structured run trace: every workflow run produces a canonical, append-only event journal — `transition.started/completed/failed` (with duration and per-key state diff), `tool.called/completed/failed` (with args and envelope; failing tool calls are now recorded), `document.emitted`, `child.queued/settled`, and `run.settled` on every park and terminal settle. The trace rides `WorkflowMetadataInterface.trace` and, for stateless runs, the resume carrier — a resumed run's trace is complete across park/resume with continuous ordering. `TestRun` gains `trace` and `toolCalls`; `path` derives from the trace's terminal transition events. Trace persistence is opt-in per run: `loopstack run --trace` (or `trace: true` on the start payload) persists the run tree's events as `core_run_trace_event` rows with full payloads, the `trace` module option / `LOOPSTACK_TRACE=true` enables it globally — absorbing the tool-call audit table. `GET /workflows/:id/tool-calls` and `loopstack runs --record` are backed by trace events with an unchanged response contract; `seq` is monotonic per run in both stateless and DB mode. `WorkflowRunner.runSync` stateless results carry `trace` instead of `history`.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`be17913`](https://github.com/loopstack-ai/loopstack/commit/be179131588d1bc01b783648876c36b74ac1b6ab) Thanks [@jakobklippel](https://github.com/jakobklippel)! - The hermetic test facade now boots infra-backed feature modules that previously crashed at DI time. Two generic fixes in the mock infrastructure: the mock `DataSource` carries an empty `entityMetadatas` list and a non-mongo `options.type`, so `@nestjs/typeorm`'s repository factory resolves a mock repository for any feature entity (`TypeOrmModule.forFeature([Entity])`) without a real connection; and a stubbed `WorkflowRunner` is provided globally, so feature modules whose controllers inject it (OAuth callbacks, scheduling webhooks/cron) can be constructed. Workflows that use git, remote-client, secrets, or sandbox tools can now be tested with ordinary `runWorkflow` + replay instead of per-tool fakes. The internal `MockDataSourceModule` is renamed `MockInfraModule` to reflect its wider role.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`66b3387`](https://github.com/loopstack-ai/loopstack/commit/66b3387f4098feff0fc1ee7d79db72115bf371a9) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Three trace consumers: `coverage(runs, WorkflowClass)` answers "did these runs exercise every declared transition and park?" as a query over run traces; `diffTraces(expected, actual)` compares two traces by behavioral identity (timings and generated keys ignored) and reports the first divergence with both events and the differing field; `createContractFake(ToolClass)` is the contract-honest DI mock — scripted envelopes are validated against the tool's `resultSchema` at scripting time, closing the one scripted world the pipeline never checks.

### Patch Changes

- Updated dependencies [[`32e24b7`](https://github.com/loopstack-ai/loopstack/commit/32e24b7f626a29745fd8caba67d179c198200992), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f), [`2fa0496`](https://github.com/loopstack-ai/loopstack/commit/2fa0496105884671d07b449536ff84f4f482e1e2), [`d281a50`](https://github.com/loopstack-ai/loopstack/commit/d281a5006432194632f3c417e958740fd29108e7), [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4), [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd), [`084975e`](https://github.com/loopstack-ai/loopstack/commit/084975e2a43ebcc55d4f29621fa548cf1a6f48da)]:
  - @loopstack/contracts@0.38.0
  - @loopstack/core@0.38.0
  - @loopstack/common@0.38.0

## 0.37.0

### Patch Changes

- Updated dependencies [[`2f37cea`](https://github.com/loopstack-ai/loopstack/commit/2f37ceac3d13380b7e25ff5b8e57e11b0b598897), [`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841)]:
  - @loopstack/core@0.37.0
  - @loopstack/common@0.37.0

## 0.36.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/common@0.36.0
  - @loopstack/core@0.36.0

## 0.35.0

### Patch Changes

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/core@0.35.0

## 0.34.0

### Patch Changes

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0
  - @loopstack/core@0.34.0

## 0.33.0

### Patch Changes

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/core@0.33.0

## 0.32.3

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies (NestJS, rxjs, class-transformer, etc.) from dependencies to devDependencies + peerDependencies

- Updated dependencies [[`228d08b`](https://github.com/loopstack-ai/loopstack/commit/228d08b807915ecfa6ef8275714500750e797036), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/core@0.32.3
  - @loopstack/common@0.32.3

## 0.32.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/common@0.32.0
  - @loopstack/core@0.32.0

## 0.31.0

### Minor Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Rename Workspace to App, restructure FrameworkContext (this.ctx), and add WorkflowRunner service

### Patch Changes

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0

## 0.30.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0

## 0.29.0

### Patch Changes

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0

## 0.28.0

### Patch Changes

- Updated dependencies [[`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0

## 0.27.0

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0

## 0.26.0

### Patch Changes

- Updated dependencies [[`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c)]:
  - @loopstack/core@0.26.0
  - @loopstack/common@0.26.0

## 0.25.2

### Patch Changes

- [#124](https://github.com/loopstack-ai/loopstack/pull/124) [`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Revert deps

- Updated dependencies [[`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22)]:
  - @loopstack/common@0.25.2
  - @loopstack/core@0.25.2

## 0.25.1

### Patch Changes

- [#121](https://github.com/loopstack-ai/loopstack/pull/121) [`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update dependencies

- Updated dependencies [[`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f)]:
  - @loopstack/common@0.25.1
  - @loopstack/core@0.25.1

## 0.25.0

### Minor Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to workflow core v2

### Patch Changes

- Updated dependencies [[`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154)]:
  - @loopstack/core@0.25.0
  - @loopstack/common@0.25.0

## 0.24.0

### Patch Changes

- [#109](https://github.com/loopstack-ai/loopstack/pull/109) [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add secrets management system and consolidate document types into core
  - New SecretEntity, SecretService, and SecretController with full CRUD API
  - Move built-in document types (error, link, markdown, message, plain) from core-ui-module into core
  - Add SecretRequestDocument and RequestSecretsTool for workflow-driven secret collection
  - Add CreateDocument tool for dynamic document creation in workflows
  - Add secrets management panel and SecretInput widget to Studio
  - Refactor ToolResult.effects to array and add ToolCallEntry/ToolCallsMap interfaces
  - Simplify UiElementSchema in contracts

- Updated dependencies [[`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8)]:
  - @loopstack/core@0.24.0
  - @loopstack/common@0.24.0

## 0.23.0

### Patch Changes

- Updated dependencies [[`07e62db`](https://github.com/loopstack-ai/loopstack/commit/07e62db4140f6c22c3fd4ecd6b88a32f82ffb0ed)]:
  - @loopstack/common@0.23.0
  - @loopstack/core@0.23.0

## 0.22.0

### Patch Changes

- [#86](https://github.com/loopstack-ai/loopstack/pull/86) [`ebf5580`](https://github.com/loopstack-ai/loopstack/commit/ebf5580b7906a02589e143edc1cdf24e3860873e) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix missing entity mock

- Updated dependencies [[`2606b29`](https://github.com/loopstack-ai/loopstack/commit/2606b29d3bcf893f41b2d5e7d47fb1c5323e4135)]:
  - @loopstack/common@0.22.0
  - @loopstack/core@0.22.0

## 0.21.0

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`65fbbee`](https://github.com/loopstack-ai/loopstack/commit/65fbbeef7bda3a328327adf0fa451052c4ce86ba), [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/common@0.21.0
  - @loopstack/core@0.21.0

## 0.21.0-rc.0

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/common@0.21.0-rc.0
  - @loopstack/core@0.21.0-rc.0

## 0.20.3

### Patch Changes

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Allow stateless workflow execution

- Updated dependencies [[`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8), [`e4945ab`](https://github.com/loopstack-ai/loopstack/commit/e4945ab0596cd074213923f38d1d8fe239fb6ceb), [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c)]:
  - @loopstack/common@0.20.3
  - @loopstack/core@0.20.3

## 0.20.0

### Minor Changes

- [#58](https://github.com/loopstack-ai/loopstack/pull/58) [`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Implement property decorators to replace class decorators With\*

### Patch Changes

- Updated dependencies [[`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570)]:
  - @loopstack/common@0.20.0
  - @loopstack/core@0.20.0

## 0.19.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8), [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/common@0.19.0
  - @loopstack/core@0.19.0

## 0.19.0-rc.1

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/common@0.19.0-rc.1
  - @loopstack/core@0.19.0-rc.1

## 0.19.0-rc.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8)]:
  - @loopstack/common@0.19.0-rc.0
  - @loopstack/core@0.19.0-rc.0

## 0.18.1

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.18.1
  - @loopstack/core@0.18.1

## 0.18.0

### Minor Changes

- [#8](https://github.com/loopstack-ai/loopstack/pull/8) [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Test Release

### Patch Changes

- Updated dependencies [[`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101), [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/core@0.18.0
  - @loopstack/common@0.18.0

## 0.18.0-rc.2

### Patch Changes

- Updated dependencies [[`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101)]:
  - @loopstack/core@0.18.0-rc.2
  - @loopstack/common@0.18.0-rc.2

## 0.18.0-rc.1

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.18.0-rc.1
  - @loopstack/core@0.18.0-rc.1

## 0.18.0-rc.0

### Minor Changes

- [#8](https://github.com/loopstack-ai/loopstack/pull/8) [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Test Release

### Patch Changes

- Updated dependencies [[`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/core@0.18.0-rc.0
  - @loopstack/common@0.18.0-rc.0
