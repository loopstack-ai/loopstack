# @loopstack/core

## 0.45.0

### Minor Changes

- [#435](https://github.com/loopstack-ai/loopstack/pull/435) [`2ea921f`](https://github.com/loopstack-ai/loopstack/commit/2ea921f59e64f3aa6208ac5e429f085725865522) Thanks [@jakobklippel](https://github.com/jakobklippel)! - A Redis database per deployment, and a clear error when two share one.
  - `resolveRedisConnection()` in `@loopstack/common` is the one place Redis settings are resolved, for the
    task queue, the OAuth token and session stores, and the quota counters. Precedence: explicit options,
    `REDIS_URL`, the discrete `REDIS_*` vars, then `localhost:6379` on database `0`.
  - `redis.db` / `REDIS_DB` selects the database, and a `REDIS_URL` path now sets it — `redis://host:6379/2`
    resolves to database `2` instead of being ignored.
  - `QuotaModule.forRoot` resolves its connection the same way, so it honors `REDIS_URL` like everything
    else; `forRootAsync` reads `QUOTA_REDIS_DB`.
  - A worker handed a workflow its deployment never registered refuses the job as an `UnrecoverableError`
    instead of retrying three times. The run fails immediately, and its error states that two deployments
    are sharing the Redis database and its `task-queue`, and that each needs its own.
  - `WorkflowRegistryService` gains `hasName()` and `names()`.

- [#435](https://github.com/loopstack-ai/loopstack/pull/435) [`c4639e8`](https://github.com/loopstack-ai/loopstack/commit/c4639e8ca6d7fd4f423b4befb160890d1b52e20c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - A `workflow.settled` event announces a run that reached a terminal state.
  - `WORKFLOW_SETTLED` and `WorkflowSettledEvent` (`{ id, workspaceId, workflowName, parentId?, status, user }`) are
    exported from `@loopstack/core`. The event is emitted for completed, failed and canceled runs, sub-workflows
    included, so a host application can release what it held for a run — a claimed resource, a reserved slot — without
    polling. The counterpart of `workspace.deleted` / `workflow.deleted`, for the end of a run rather than the end of
    its record.
  - Emitted from `WorkflowOrchestrationService.complete()`, which every settling path already calls, before the return
    for a run with no parent callback. A listener that throws is logged and does not take the parent's callback with it.
  - Consumers must be idempotent: the event is not guaranteed exactly once per run, and a process that dies before its
    listener ran never sees it. Anything whose correctness depends on it should reconcile against the run's status and
    treat the event as what makes that prompt.
  - `WorkflowOrchestrationService.cancel()` calls `complete()` unconditionally; the guard it repeated lives in
    `complete()` itself.

### Patch Changes

- Updated dependencies [[`2ea921f`](https://github.com/loopstack-ai/loopstack/commit/2ea921f59e64f3aa6208ac5e429f085725865522)]:
  - @loopstack/common@0.45.0

## 0.44.2

### Patch Changes

- [#430](https://github.com/loopstack-ai/loopstack/pull/430) [`72939b6`](https://github.com/loopstack-ai/loopstack/commit/72939b6f27b9ba6c7fc6b3cc40d770a525fdd773) Thanks [@jakobklippel](https://github.com/jakobklippel)! - A graceful shutdown no longer waits indefinitely for a run inside a long transition.
  - The drain waits at most `SHUTDOWN_DRAIN_TIMEOUT_MS` (default 30 seconds, read at shutdown time) for in-flight runs
    to yield, then closes the worker by force. The jobs still running are redelivered after restart and re-run their
    interrupted transition from its checkpoint — the same recovery a crash takes.
  - A second `SIGINT`/`SIGTERM` during the drain forces the close at once, so a second Ctrl+C stops the process.
  - The drain logs which runs it is waiting for and when it will force.

## 0.44.1

### Patch Changes

- [#424](https://github.com/loopstack-ai/loopstack/pull/424) [`e0552a8`](https://github.com/loopstack-ai/loopstack/commit/e0552a8561926988c3926fe125ab7633c7eea0f3) Thanks [@jakobklippel](https://github.com/jakobklippel)! - A run interrupted in the middle of its auto-transitions continues instead of staying `running` forever.
  - A task without a transition continues the run from its current place. A task BullMQ redelivers after its process
    died picks the run up at its latest checkpoint, re-running the transition that was cut off; a run parked on a wait
    transition settles back to `waiting`.
  - On shutdown (`app.enableShutdownHooks()`), runs stop before their next transition and queue a continuation; the
    worker closes once its active jobs have returned, before the database connection goes away.
  - A job the queue gives up on — out of attempts or stalled too often — fails its run at the place it reached, so the
    parent is called back and a manual retry re-enters it.

- Updated dependencies [[`e0552a8`](https://github.com/loopstack-ai/loopstack/commit/e0552a8561926988c3926fe125ab7633c7eea0f3)]:
  - @loopstack/common@0.44.1

## 0.44.0

### Minor Changes

- [#420](https://github.com/loopstack-ai/loopstack/pull/420) [`e683f2e`](https://github.com/loopstack-ai/loopstack/commit/e683f2e77230c0f9b71735d78155042c6ea18d37) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Read the task processor's concurrency from `TASK_CONCURRENCY`, and export the resolved value.

  How many tasks a process runs at once is a budget applications have to plan against rather than an internal
  detail: a workflow that occupies a task for its whole lifetime — a long-running agent session, say — holds
  one of those slots for that long, so an application running several of them at once needs to know how many
  exist and leave headroom for everything else in the process. The variable sets it, defaulting to 10, and
  `TASK_CONCURRENCY` is exported from `@loopstack/core` so that headroom can be asserted at boot.

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

- [#420](https://github.com/loopstack-ai/loopstack/pull/420) [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Every `jsonb` column scrubs what Postgres cannot store.

  Postgres `jsonb` is backed by its text type, which can represent neither U+0000 nor an unpaired UTF-16
  surrogate — an insert carrying either is rejected with `unsupported Unicode escape sequence`. Such a
  character never comes from the engine itself; it arrives with the content a run handles, from a tool that
  read a binary file, a subprocess whose output was not valid UTF-8, or an LLM transcript quoting either of
  those. What it costs is a whole run rather than one document: the rejected insert fails the transition that
  wrote it, and the retry replays the same content, so the run cannot get past it.
  - `@loopstack/common`: `sanitizeForJsonb()` and `JsonbTransformer` drop U+0000 and replace a lone surrogate
    with U+FFFD. The transformer is applied to every `jsonb` column — a document's `content`, `meta` and
    validation error, a workflow's `args`, `context`, `result`, `callbackMetadata` and `availableTransitions`,
    a checkpoint's `state`, and a run-trace event's `payload` — so neither a saved document nor the state a
    transition assigns can carry one. A value with nothing to scrub reaches the driver untouched.
  - `@loopstack/core`: a document whose write the database rejects is named in the log — document name, key,
    transition and workflow — next to the error, which by itself reports only the column it violated.

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

- [#420](https://github.com/loopstack-ai/loopstack/pull/420) [`0c73301`](https://github.com/loopstack-ai/loopstack/commit/0c73301b72f7ff84fe622710543965d9e51f2855) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `@nestjs/config` is a peer dependency (`^4.0.0 || ^12.0.0`), so every package injects the app's own `ConfigService`.
  A NestJS 11 app on `@nestjs/config` 4.x now boots with a single copy of `@nestjs/config`, the one its
  `ConfigModule.forRoot()` registers.
- Updated dependencies [[`d5093f6`](https://github.com/loopstack-ai/loopstack/commit/d5093f62686443e86906293cc97db58e90b4dfba), [`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`c2d9d3e`](https://github.com/loopstack-ai/loopstack/commit/c2d9d3e8aa032512de6207e0a3bd0c8afba629e4), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9), [`fed5c64`](https://github.com/loopstack-ai/loopstack/commit/fed5c6449bae7eec18b120d02ab7526ccec398cd)]:
  - @loopstack/contracts@0.44.0
  - @loopstack/common@0.44.0

## 0.43.0

### Minor Changes

- [#350](https://github.com/loopstack-ai/loopstack/pull/350) [`fde95c4`](https://github.com/loopstack-ai/loopstack/commit/fde95c4d1e326b7ca9257b5d2c7f1d46565f4a0f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Expose `runTransition` from `@loopstack/core/testing`.

  The helper runs a transition inside a real `ExecutionScope` and returns the committed state and result
  drafts, for unit tests that instantiate a workflow directly. It sits beside the `ExecutionScope` and
  `RunTraceCollector` it wires up, on a dedicated subpath that keeps it out of the package's main entry point.
  It accepts a workflow's state interface as its state type, given explicitly or inferred from a typed seed.

## 0.42.0

### Minor Changes

- [#346](https://github.com/loopstack-ai/loopstack/pull/346) [`686e121`](https://github.com/loopstack-ai/loopstack/commit/686e121704c2cbdf24bd21139121bd3c92dbc97d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Let a sub-workflow run in another workspace: `RunOptions.workspaceId` on `workflow.run()` /
  `orchestrator.queue()` names the workspace the child belongs to, defaulting to the parent's as before.

  Tasks serialize per workspace, so this is what lets a parent start work that runs **at the same time** as
  its own workspace's rather than behind it — the child takes the named workspace's lock instead. The parent
  callback is unaffected: it is still scheduled under the parent's own workspace, so ordering there is
  unchanged and a child finishing elsewhere resumes its parent exactly as one at home does. The workspace must
  already exist.

### Patch Changes

- Updated dependencies [[`686e121`](https://github.com/loopstack-ai/loopstack/commit/686e121704c2cbdf24bd21139121bd3c92dbc97d), [`6436004`](https://github.com/loopstack-ai/loopstack/commit/6436004c0c161d836e5ff416d39926f913fbbc8e), [`341aa7f`](https://github.com/loopstack-ai/loopstack/commit/341aa7fb85e437509a100b3af7e11e015626a22d)]:
  - @loopstack/common@0.42.0

## 0.41.0

### Minor Changes

- [#253](https://github.com/loopstack-ai/loopstack/pull/253) [`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Live workflow preview in Studio. The preview panel now follows a running app's dynamic connection URL and only lists environments that are actually running: `WorkspaceEnvironmentDto` exposes `status`, `EnvironmentService.markRunning` records the app URL as `connectionUrl` (and no longer defaults it to the agent URL) while `markStopped` clears it. A new `environment.updated` workspace event — dispatched by `EnvironmentService` and the environment controller — invalidates the workspace-environments query via the live event stream, so the panel updates to the new URL (and drops torn-down slots) without a page reload.

### Patch Changes

- Updated dependencies [[`300165b`](https://github.com/loopstack-ai/loopstack/commit/300165b5f158c916d07da9ada867cdeb69111aab)]:
  - @loopstack/common@0.41.0

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

## 0.39.0

### Minor Changes

- [#249](https://github.com/loopstack-ai/loopstack/pull/249) [`806244a`](https://github.com/loopstack-ai/loopstack/commit/806244ae2e12aa5b8ab364bd1b6e71fdb9c13972) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Connection URLs and a Postgres/Redis-only default compose file
  - `LoopstackModule.forRoot()` now honors a single `DATABASE_URL` (passed to TypeORM as `url`) when set and
    no programmatic `database` options are given; the discrete `DATABASE_*` vars remain as fallback. The core
    task queue likewise honors `REDIS_URL`, falling back to `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`. This
    makes managed/hosted environments (and any "bring your own instance" setup) a first-class configuration
    path.
  - The shipped `docker-compose.yml` now starts **Postgres + Redis only**; Studio moved to a separate,
    optional `docker-compose.studio.yml`. The combined `docker-compose.infra.yml` is removed (the default is
    now infra-only).

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.39.0

## 0.38.0

### Minor Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fault injection and deterministic time for workflow tests: `failure(message?, status?)` scripts a failed/canceled sub-workflow callback as an answer — `errorPlace`/retry routing and inline `input.status === 'failed'` handling become reachable from ordinary tests, composing with `queue()`. The framework gains an injectable `Clock` (`CLOCK` token, `SystemClock` default) consumed by the transition-timeout race and trace timestamps; `runWorkflow`'s `clock` option accepts a `TestClock` (settable `now`, `advance(ms)`, `waitForScheduled()`) making transition timeouts testable without real waiting and trace timestamps reproducible.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replay fixture format v3 — config drift detection: fixture entries capture the call's validated `config` as assertion metadata alongside `args`, so a changed system prompt, model, or tool list fails the replayed test instead of silently passing against a stale fixture. Config is captured at both capture points (`ToolExecutionContext.config` for in-process recording — visible to all tool interceptors — and the `config` field on tool trace events for `loopstack runs --record`). Version 2 fixtures are rejected with a re-record message; hand-written entries that omit `config` don't assert it.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4) Thanks [@jakobklippel](https://github.com/jakobklippel)! - In-process workflow testing: stateless runs now record their transition `history`, park-and-resume via a `statelessState` carrier (scripted HITL answers without persistence), and execute sub-workflows inline with automatic callback delivery. `@loopstack/testing` gains the `runWorkflow()` / `testTool()` / `replay()` facade with transition-scoped tool-response replay and drift warnings. Debug-mode tool-call auditing (`core_tool_call_record`) with a `GET /workflows/:id/tool-calls` endpoint and `client.workflows.toolCalls()` powers replay fixture recording.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Structured run trace: every workflow run produces a canonical, append-only event journal — `transition.started/completed/failed` (with duration and per-key state diff), `tool.called/completed/failed` (with args and envelope; failing tool calls are now recorded), `document.emitted`, `child.queued/settled`, and `run.settled` on every park and terminal settle. The trace rides `WorkflowMetadataInterface.trace` and, for stateless runs, the resume carrier — a resumed run's trace is complete across park/resume with continuous ordering. `TestRun` gains `trace` and `toolCalls`; `path` derives from the trace's terminal transition events. Trace persistence is opt-in per run: `loopstack run --trace` (or `trace: true` on the start payload) persists the run tree's events as `core_run_trace_event` rows with full payloads, the `trace` module option / `LOOPSTACK_TRACE=true` enables it globally — absorbing the tool-call audit table. `GET /workflows/:id/tool-calls` and `loopstack runs --record` are backed by trace events with an unchanged response contract; `seq` is monotonic per run in both stateless and DB mode. `WorkflowRunner.runSync` stateless results carry `trace` instead of `history`.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Tools produce documents by declaring them on the result envelope (`documents: [{ documentName, content, options }]`) instead of writing inside `handle()`. The tool pipeline applies declarations through the document store after the interceptor chain — success envelopes only, a failing save fails the call — so replayed test fixtures materialize the same documents a live run would. The three LLM tools (`llm_generate_text`, `llm_delegate_tool_calls`, `llm_update_tool_result`) now declare their message documents; recordings made before this change carry no declarations, so re-record fixtures to see tool-produced documents under replay. Adds `ToolDocumentDeclaration`/`ToolDocumentDeclarationSchema` (common) and `resolveDocumentClass` (core).

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Tool result contracts: `@Tool({ resultSchema })` declares a Zod schema for the tool's result, validated on `envelope.data` of every success envelope at the tool pipeline's single exit — covering live results, interceptor-transformed envelopes, and replayed test fixtures identically. Error and pending envelopes are exempt; the field is optional. New `parseToolResult()` and `getBlockResultSchema()` utilities in `@loopstack/common`. `BaseTool.complete()` no longer has a passthrough fallback — async tools that can succeed must implement `complete()` explicitly; the base implementation throws with a named error.

### Patch Changes

- [#243](https://github.com/loopstack-ai/loopstack/pull/243) [`32e24b7`](https://github.com/loopstack-ai/loopstack/commit/32e24b7f626a29745fd8caba67d179c198200992) Thanks [@jakobklippel](https://github.com/jakobklippel)! - - **`readonly` form fields are enforced** (api): transition submissions through the API are validated against the active prompt document — changing a field marked `readonly: true` (widget config `options.properties`, schema fallback, Studio's own resolution rule) is rejected with 400 naming the field. Scoped to transitions the document's widget declares; internal transitions (sub-workflow callbacks) are unaffected.
  - **`DocumentFilterSchema` gains `place`** (contracts): documents are filterable by the place they were saved in — the server-side backbone for Studio-parity prompt discovery.
  - **UUID path params are validated** (api): malformed ids on workflow/document/workspace/processor endpoints return 400 instead of 500.
  - **`workflow.created` is dispatched for root workflows too** (core): clients following a run see sub-workflows join the tree reliably, including when creation happens outside the standard orchestration path.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`084975e`](https://github.com/loopstack-ai/loopstack/commit/084975e2a43ebcc55d4f29621fa548cf1a6f48da) Thanks [@jakobklippel](https://github.com/jakobklippel)! - The task-queue worker tolerates a few stalled attempts before BullMQ fails a job permanently (`maxStalledCount: 3`). A job stalls when its process dies mid-transition (a crash or a non-graceful deploy); the previous default of 1 killed a run on its second interruption. Pair with `app.enableShutdownHooks()` in your `main.ts` so in-flight transitions finish on SIGTERM instead of stalling.

- Updated dependencies [[`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f), [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4), [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd)]:
  - @loopstack/common@0.38.0

## 0.37.0

### Minor Changes

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`2f37cea`](https://github.com/loopstack-ai/loopstack/commit/2f37ceac3d13380b7e25ff5b8e57e11b0b598897) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Run tracing over the wire: `workflow.updated` events now carry the workflow's current `place`, so stream consumers can render step-level progress without a round-trip per transition, and `WorkflowFullSchema` exposes the run's published `result` (built via `assignResult`/`setResult`) through `GET /api/v1/workflows/:id`.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Config and dashboard move to zod-first contracts and the SDK. `StudioAppConfigSchema`, `WorkflowConfigSchema`, `ToolConfigSchema`, `WorkflowSourceSchema`, `AvailableEnvironmentSchema`, and `DashboardStatsSchema` replace the class-transformer DTOs; the config and dashboard controllers map responses explicitly with dev-time schema assertion. `StudioAppConfig` now has a single definition in contracts (core's discovery service adopts it), the config interfaces move from the `/types` to the `/api` subpath, and `DashboardStatsInterface` drops the never-sent `workspaceCount`/`totalAutomations` fields. Wire fixes: workflow config responses now include `workflowName`, and dashboard `recentRuns`/`recentErrors` are mapped `WorkflowItem` projections instead of raw entities. The client gains `config` (apps, workflowConfig, workflowSource, tools, tool, availableEnvironments) and `dashboard` (stats) resources with envKey-scoped query descriptors.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Make the workflows/documents/processor REST surface zod-first. `@loopstack/contracts/api` now defines zod schemas (with the existing `*Interface` names as inferred types) for workflow item/full/status/create/update/filter, documents, checkpoints, processor payloads, batch delete, and paginated lists. The api package validates request bodies and JSON query params with `ZodValidationPipe`/`ZodJsonQueryPipe`, restricts sort fields to real entity columns, and builds responses through explicit mapper functions that are schema-validated outside production — replacing the class-validator/class-transformer DTOs for these controllers, which are removed. Wire-truth fixes along the way: workflow `title` is typed nullable, document timestamps are ISO strings, `validationError` is now actually serialized, checkpoints are typed, and run-payload transitions accept an omitted `id`. `WorkflowRunResult` lives in contracts and is re-exported by `@loopstack/common`.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Adopt the typed `ClientMessage` union from `@loopstack/contracts/events` across the event pipeline. `ClientMessageService` now exposes typed dispatch methods (`dispatchWorkflowCreated`/`dispatchWorkflowUpdated`/`dispatchDocumentCreated`) and validates messages against the schema outside production; `workflow.updated` events carry the workflow `status` inline. The untyped `ClientMessageInterface` and `ClientMessageDto` are removed, and `@loopstack/common` re-exports `WorkflowState` from contracts instead of duplicating the enum.

### Patch Changes

- Updated dependencies [[`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841)]:
  - @loopstack/common@0.37.0

## 0.36.0

### Minor Changes

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

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `BaseWorkflow<TArgs, TInput = TArgs>` now exposes a second generic for workflows whose call-site shape differs from their persisted shape. Normalization moves into a zod `.transform()` on the workflow's schema; the run-args parse pipeline now runs once at the boundary (queue or stateless entry) instead of twice. `FanOutWorkflow` and `SequenceWorkflow` use this pattern — their `run()` overrides and `as unknown as` casts are gone.

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

## 0.35.0

### Minor Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `CallbackSchema` exposes `hasError: boolean` and `errorMessage: string | null` so a parent workflow can branch on a child's failure without parsing `status` strings or querying the child entity. The orchestrator populates both fields from the terminating child when it dispatches the parent's callback. The framework no longer auto-saves an `ErrorDocument` on caught transition exceptions — those failures surface via the workflow's own `errorMessage` field and the Retry affordance, so the document stream only contains errors explicitly recorded by user workflows. `@loopstack/run-sub-workflow-example` adds a `FailingSubWorkflow`, an `ErrorHandlingWorkflow` that exercises the error UI in both `show: 'inline'` and `show: 'link'` modes, and a `ShowModesWorkflow` that chains all three render modes (`inline → link → hidden`) in one flow.

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add `FanOutWorkflow` and `SequenceWorkflow` coordination primitives for launching multiple sub-workflows in parallel or sequentially with a single aggregated callback. Both support `'all'` (fail-fast, cancel siblings / abort) and `'allSettled'` failure modes, and accept items as either an ordered array or a keyed record (results mirror the input shape). Auto-registered by `LoopstackModule` — inject and call like any other sub-workflow. Demonstrated in `run-sub-workflow-example` alongside the existing sequential single-child demo.

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Slim `GET /workflows/:id/status` endpoint plus a `useWorkflowStatus` hook so Studio's embedded sub-workflow link cards react to live state without pulling the full workflow payload on every SSE tick. The link card now auto-collapses when its child reaches a terminal state, and its initial expanded value is deferred until the live status arrives — so waiting/running children stay expanded on reload, completed ones come back collapsed, and there is no expand-then-collapse flicker. `WORKFLOW_UPDATED` SSE messages now carry `parentId` so the parent's children-list cache is invalidated when a child transitions, which keeps the execution timeline, workflow list, and history list in sync with live child status.

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Sub-workflow rendering is now controlled by a single `show` option on `RunOptions`, and the orchestrator auto-creates the link card so the parent's view never goes blank.

  `BaseWorkflow.run()` accepts `show?: 'inline' | 'link' | 'hidden'` (default `'inline'`) and `label?: string`. The orchestrator writes the matching `LinkDocument` into the parent's stream from `WorkflowOrchestrationService.queue()` while still inside the parent's `ExecutionScope`:
  - `'inline'` — `embed: true, expanded: true` (iframe in the parent's view). Right for HITL/OAuth/agents.
  - `'link'` — `embed: false` (status card opens in a separate window). Right for autonomous children.
  - `'hidden'` — no save. Right for fan-out / background work.

  The `status` field is removed from `LinkDocumentSchema`. The Studio `LinkCard` reads live status from `useChildWorkflows(parentId)` (already SSE-invalidated) and maps `WorkflowState` to its colored badge — there is no longer any denormalized status to keep in sync.

  All registry features, examples, and sandbox call sites drop their manual `documentStore.save(LinkDocument, …)` pairs around `subWorkflow.run()` and pass `show` + `label` on the `.run()` call instead.

### Patch Changes

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0

## 0.34.0

### Minor Changes

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Sub-workflow rendering is now controlled by a single `show` option on `RunOptions`, and the orchestrator auto-creates the link card so the parent's view never goes blank.

  `BaseWorkflow.run()` accepts `show?: 'inline' | 'link' | 'hidden'` (default `'inline'`) and `label?: string`. The orchestrator writes the matching `LinkDocument` into the parent's stream from `WorkflowOrchestrationService.queue()` while still inside the parent's `ExecutionScope`:
  - `'inline'` — `embed: true, expanded: true` (iframe in the parent's view). Right for HITL/OAuth/agents.
  - `'link'` — `embed: false` (status card opens in a separate window). Right for autonomous children.
  - `'hidden'` — no save. Right for fan-out / background work.

  The `status` field is removed from `LinkDocumentSchema`. The Studio `LinkCard` reads live status from `useChildWorkflows(parentId)` (already SSE-invalidated) and maps `WorkflowState` to its colored badge — there is no longer any denormalized status to keep in sync.

  All registry features, examples, and sandbox call sites drop their manual `documentStore.save(LinkDocument, …)` pairs around `subWorkflow.run()` and pass `show` + `label` on the `.run()` call instead.

### Patch Changes

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0

## 0.33.0

### Patch Changes

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0

## 0.32.3

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`228d08b`](https://github.com/loopstack-ai/loopstack/commit/228d08b807915ecfa6ef8275714500750e797036) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix document persistence in post-rollback path and guard against missing transition scope

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies (NestJS, rxjs, class-transformer, etc.) from dependencies to devDependencies + peerDependencies

- Updated dependencies [[`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/common@0.32.3

## 0.32.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/common@0.32.0

## 0.31.0

### Minor Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Rename Workspace to App, restructure FrameworkContext (this.ctx), and add WorkflowRunner service

### Patch Changes

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0

## 0.30.1

### Patch Changes

- [#150](https://github.com/loopstack-ai/loopstack/pull/150) [`4a2d886`](https://github.com/loopstack-ai/loopstack/commit/4a2d88689697be28d42d803a287b7a1780fceb65) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix Handlebars ESM import to resolve `Handlebars.compile is not a function` error

## 0.30.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Introduce LoopstackModule for simplified app bootstrapping, refactor core to DynamicModule, remove Swagger decorators, and make LoopCoreModule globally available

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/common@0.30.0

## 0.29.0

### Minor Changes

- [#143](https://github.com/loopstack-ai/loopstack/pull/143) [`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3) Thanks [@github-actions](https://github.com/apps/github-actions)! - Add provider-agnostic LLM registry with adapter tools, tool/workflow config system, and multi-provider support (Claude + OpenAI)

### Patch Changes

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0

## 0.28.0

### Minor Changes

- [#135](https://github.com/loopstack-ai/loopstack/pull/135) [`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add retry and timeout support for workflow transitions with configurable backoff strategies and error recovery

### Patch Changes

- Updated dependencies [[`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/common@0.28.0

## 0.27.0

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.27.0

## 0.26.0

### Minor Changes

- [#129](https://github.com/loopstack-ai/loopstack/pull/129) [`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Extract secrets functionality into dedicated registry module (@loopstack/secrets-module), removing secrets tools, services, entities, and documents from core, api, and common packages

### Patch Changes

- Updated dependencies [[`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c)]:
  - @loopstack/common@0.26.0

## 0.25.2

### Patch Changes

- [#124](https://github.com/loopstack-ai/loopstack/pull/124) [`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Revert deps

- Updated dependencies [[`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22)]:
  - @loopstack/common@0.25.2

## 0.25.1

### Patch Changes

- [#121](https://github.com/loopstack-ai/loopstack/pull/121) [`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update dependencies

- Updated dependencies [[`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f)]:
  - @loopstack/common@0.25.1

## 0.25.0

### Minor Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Refactor UI schema from actions/form to unified widgets array and add transition-level state assignments

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to workflow core v2

### Patch Changes

- Updated dependencies [[`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154)]:
  - @loopstack/common@0.25.0

## 0.24.0

### Minor Changes

- [#109](https://github.com/loopstack-ai/loopstack/pull/109) [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add secrets management system and consolidate document types into core
  - New SecretEntity, SecretService, and SecretController with full CRUD API
  - Move built-in document types (error, link, markdown, message, plain) from core-ui-module into core
  - Add SecretRequestDocument and RequestSecretsTool for workflow-driven secret collection
  - Add CreateDocument tool for dynamic document creation in workflows
  - Add secrets management panel and SecretInput widget to Studio
  - Refactor ToolResult.effects to array and add ToolCallEntry/ToolCallsMap interfaces
  - Simplify UiElementSchema in contracts

### Patch Changes

- Updated dependencies [[`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8)]:
  - @loopstack/common@0.24.0

## 0.23.1

### Patch Changes

- [#106](https://github.com/loopstack-ai/loopstack/pull/106) [`8d9273e`](https://github.com/loopstack-ai/loopstack/commit/8d9273e5e08191682364c4b1282953e24a929f43) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add debug logging for workflow transitions and fix template variable context in state assignments

## 0.23.0

### Patch Changes

- Updated dependencies [[`07e62db`](https://github.com/loopstack-ai/loopstack/commit/07e62db4140f6c22c3fd4ecd6b88a32f82ffb0ed)]:
  - @loopstack/common@0.23.0

## 0.22.0

### Patch Changes

- [#86](https://github.com/loopstack-ai/loopstack/pull/86) [`2606b29`](https://github.com/loopstack-ai/loopstack/commit/2606b29d3bcf893f41b2d5e7d47fb1c5323e4135) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add pipeline context to run context

- Updated dependencies [[`2606b29`](https://github.com/loopstack-ai/loopstack/commit/2606b29d3bcf893f41b2d5e7d47fb1c5323e4135)]:
  - @loopstack/common@0.22.0

## 0.21.0

### Patch Changes

- [#82](https://github.com/loopstack-ai/loopstack/pull/82) [`65fbbee`](https://github.com/loopstack-ai/loopstack/commit/65fbbeef7bda3a328327adf0fa451052c4ce86ba) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add tool execution interceptors

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`65fbbee`](https://github.com/loopstack-ai/loopstack/commit/65fbbeef7bda3a328327adf0fa451052c4ce86ba), [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/common@0.21.0

## 0.21.0-rc.0

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/common@0.21.0-rc.0

## 0.20.3

### Patch Changes

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Allow stateless workflow execution

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`e4945ab`](https://github.com/loopstack-ai/loopstack/commit/e4945ab0596cd074213923f38d1d8fe239fb6ceb) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix sub workflow execution, remove transition from template vars and in favour for use with runtime object

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix sub workflow execution flow and improve ui

- Updated dependencies [[`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8), [`e4945ab`](https://github.com/loopstack-ai/loopstack/commit/e4945ab0596cd074213923f38d1d8fe239fb6ceb), [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c)]:
  - @loopstack/common@0.20.3

## 0.20.2

### Patch Changes

- [#69](https://github.com/loopstack-ai/loopstack/pull/69) [`bbdaef3`](https://github.com/loopstack-ai/loopstack/commit/bbdaef3ebe7bfdf57a1d4c63b901639255ed3f2a) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add Sub Workflow Example and Tests

## 0.20.1

### Patch Changes

- [#65](https://github.com/loopstack-ai/loopstack/pull/65) [`ee9a033`](https://github.com/loopstack-ai/loopstack/commit/ee9a033fbbd7640ce951546d7593914e0cac852d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add JEXL support, update template expression syntax

## 0.20.0

### Minor Changes

- [#58](https://github.com/loopstack-ai/loopstack/pull/58) [`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Implement property decorators to replace class decorators With\*

### Patch Changes

- Updated dependencies [[`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570)]:
  - @loopstack/common@0.20.0

## 0.19.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8), [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/common@0.19.0

## 0.19.0-rc.1

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/common@0.19.0-rc.1

## 0.19.0-rc.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8)]:
  - @loopstack/common@0.19.0-rc.0

## 0.18.1

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.18.1

## 0.18.0

### Minor Changes

- [#8](https://github.com/loopstack-ai/loopstack/pull/8) [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Test Release

### Patch Changes

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix various bugs, Replace zod to schema package, fic cli npm install

- Updated dependencies [[`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/common@0.18.0

## 0.18.0-rc.2

### Patch Changes

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix various bugs, Replace zod to schema package, fic cli npm install

- Updated dependencies []:
  - @loopstack/common@0.18.0-rc.2

## 0.18.0-rc.1

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.18.0-rc.1

## 0.18.0-rc.0

### Minor Changes

- [#8](https://github.com/loopstack-ai/loopstack/pull/8) [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Test Release

### Patch Changes

- Updated dependencies [[`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/common@0.18.0-rc.0
