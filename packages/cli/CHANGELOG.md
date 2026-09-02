# @loopstack/cli

## 0.20.0

### Minor Changes

- [#251](https://github.com/loopstack-ai/loopstack/pull/251) [`937337c`](https://github.com/loopstack-ai/loopstack/commit/937337c8afcd5b60248c537e45403ea216ca2f8e) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `loopstack create` now scaffolds a real ESM app from a vetted template.

  The generator copies a complete, hand-verified template (`type: module`,
  `nodenext` module resolution, `.js` import extensions) instead of running
  `nest new` and patching the CommonJS output to ESM afterwards. The template
  ships pinned NestJS/runtime singletons and pulls the framework's runtime stack
  transitively, so a fresh `create → npm install → npm run build → run` succeeds
  with no `--legacy-peer-deps` and no manual ESM fixes. Dev runs use `tsx`
  (`npm run start:dev`); production builds with `nest build`. Node baseline is
  20.19+ / 22+.

## 0.19.0

### Minor Changes

- [#249](https://github.com/loopstack-ai/loopstack/pull/249) [`806244a`](https://github.com/loopstack-ai/loopstack/commit/806244ae2e12aa5b8ab364bd1b6e71fdb9c13972) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Scaffold splits infrastructure and Studio compose files

  `loopstack create` now scaffolds a `docker-compose.yml` with **Postgres + Redis only** plus a separate,
  optional `docker-compose.studio.yml` for the Studio UI. The `create` next-steps output and the generated
  `README.md`/`CLAUDE.md` lead with running workflows from the CLI (the terminal-native path for CI and
  coding agents) and treat Studio as an optional visual add-on.

- [#249](https://github.com/loopstack-ai/loopstack/pull/249) [`a2160e4`](https://github.com/loopstack-ai/loopstack/commit/a2160e4048d8d2d8bf48c35bd64b3033bf343ac8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Message completion metadata and quieter system messages

  Assistant messages can carry optional completion `meta` — model, token usage, cost, turns, and duration:
  - `@loopstack/contracts` adds `UIUsage` / `UIMessageMeta` and a `meta` field on `UIMessage`.
  - `@loopstack/llm-provider-module`'s `LlmMessageDocument` carries the `meta`.
  - The CLI (`llm-message` widget) and Studio (`LlmMessage`) render a dim completion-stats footer when a
    message has `meta`.
  - System messages now render as compact status lines (a single info icon, no card or per-message emoji)
    instead of full message cards.

### Patch Changes

- Updated dependencies [[`6db1211`](https://github.com/loopstack-ai/loopstack/commit/6db1211737605e14bfd7bd9a0f5a64a978052686), [`a2160e4`](https://github.com/loopstack-ai/loopstack/commit/a2160e4048d8d2d8bf48c35bd64b3033bf343ac8)]:
  - @loopstack/contracts@0.39.0
  - @loopstack/client@0.39.0

## 0.18.0

### Minor Changes

- [#243](https://github.com/loopstack-ai/loopstack/pull/243) [`af03db8`](https://github.com/loopstack-ai/loopstack/commit/af03db801a1f72f24da03e956e14ac80e4b5f3a0) Thanks [@jakobklippel](https://github.com/jakobklippel)! - The terminal is a first-class client for human-in-the-loop runs:
  - **Unified widget registry** — one registry drives both rendering and interaction (`render`/`collect` per widget); what the CLI can answer is exactly what has a collect implementation. Message, markdown, error, link, form, and JSON-fallback rendering; text/confirm/choices prompts, chat inputs, buttons, and forms as interactive widgets.
  - **Forms are picker-first** — content renders, actions submit it directly (Studio-equivalent), `e` opens the complete content JSON in `$EDITOR`. Field order and labels follow Studio (widget config over schema); `readonly: true` fields have local edits discarded with a warning.
  - **`loopstack attach <run-id>`** — rejoin a run like `docker attach`: full transcript, then live streaming and prompts. `runs <run-id>` prints the complete transcript (documents of the whole run tree, chronological, railed by nesting).
  - **Secret entry** (`secret-input`) — values collected without echo (already-stored keys keep on enter), stored via the workspace secrets API, never in the transcript or transition payload.
  - **Honest waits, never hangs** — a wait on input the CLI can't collect is named explicitly (e.g. `waiting for browser sign-in (google) — open the sign-in link above`) with a Studio link; interactive sessions stay attached so browser round-trips (OAuth) resume automatically; non-interactive shells exit 3. Parked sub-workflows no longer read as "still processing".
  - **Interactive retry** — failed runs offer `r. retry` (Studio's Retry equivalent) and surface error-place recovery buttons in the same prompt.
  - **Live tool calls** — `⚒ name {args}` streams during the turn (deduped against the persisted message), railed by sub-workflow depth; `show: 'hidden'` children render nothing, like Studio.
  - Prompt matching follows Studio's rules: documents active at the workflow's current place (or `meta.enableAtPlaces`), interactive when a declared transition is available.
  - **Multi-prompt sequences work end to end** — when sub-workflows ask one question after another while the root stays parked on its callback (e.g. `connect_github`), the idle hook re-arms after each answer, so every follow-up prompt is discovered without needing a root status change.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Non-interactive HITL answering for agents and scripts: new `loopstack answer <run-id>` command (`--arg` / `--payload` / `--transition`), a machine-readable `pendingPrompt` (description, schema, transition) in `runs <run-id> --json`, and `runs <run-id> --record <file>` to derive replay fixtures from a run's recorded tool calls. The scaffolded CLAUDE.md teaches the run → exit 3 → read prompt → answer loop.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`d281a50`](https://github.com/loopstack-ai/loopstack/commit/d281a5006432194632f3c417e958740fd29108e7) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Prompt discovery now runs on the canonical park-view rules from `@loopstack/contracts/park-view` — the same rules `TestRun.parkView()` asserts against; the CLI keeps only its tree fetching and collect-widget answerability. Two behavior refinements come with the shared rules: documents hidden via `meta.hideAtPlaces` or internal tagging are no longer offered as prompts, and a widget declaring no transition is only answerable when exactly one transition is available.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Structured run trace: every workflow run produces a canonical, append-only event journal — `transition.started/completed/failed` (with duration and per-key state diff), `tool.called/completed/failed` (with args and envelope; failing tool calls are now recorded), `document.emitted`, `child.queued/settled`, and `run.settled` on every park and terminal settle. The trace rides `WorkflowMetadataInterface.trace` and, for stateless runs, the resume carrier — a resumed run's trace is complete across park/resume with continuous ordering. `TestRun` gains `trace` and `toolCalls`; `path` derives from the trace's terminal transition events. Trace persistence is opt-in per run: `loopstack run --trace` (or `trace: true` on the start payload) persists the run tree's events as `core_run_trace_event` rows with full payloads, the `trace` module option / `LOOPSTACK_TRACE=true` enables it globally — absorbing the tool-call audit table. `GET /workflows/:id/tool-calls` and `loopstack runs --record` are backed by trace events with an unchanged response contract; `seq` is monotonic per run in both stateless and DB mode. `WorkflowRunner.runSync` stateless results carry `trace` instead of `history`.

### Patch Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replay fixture format v3 — config drift detection: fixture entries capture the call's validated `config` as assertion metadata alongside `args`, so a changed system prompt, model, or tool list fails the replayed test instead of silently passing against a stale fixture. Config is captured at both capture points (`ToolExecutionContext.config` for in-process recording — visible to all tool interceptors — and the `config` field on tool trace events for `loopstack runs --record`). Version 2 fixtures are rejected with a re-record message; hand-written entries that omit `config` don't assert it.

- Updated dependencies [[`32e24b7`](https://github.com/loopstack-ai/loopstack/commit/32e24b7f626a29745fd8caba67d179c198200992), [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f), [`2fa0496`](https://github.com/loopstack-ai/loopstack/commit/2fa0496105884671d07b449536ff84f4f482e1e2), [`d281a50`](https://github.com/loopstack-ai/loopstack/commit/d281a5006432194632f3c417e958740fd29108e7), [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4), [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd)]:
  - @loopstack/contracts@0.38.0
  - @loopstack/client@0.38.0

## 0.17.0

### Minor Changes

- [#240](https://github.com/loopstack-ai/loopstack/pull/240) [`ab0d9ab`](https://github.com/loopstack-ai/loopstack/commit/ab0d9ab809872c1bc0293dda8944d8171dacf6a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Followed runs now show what the workflow actually produced: message documents render live as they are saved (from the run and its sub-workflows — prompts, LLM messages, and links excluded), LLM tokens stream from sub-workflows too, and the published result prints in human mode (`run` on completion and `runs <run-id>`).

- [#240](https://github.com/loopstack-ai/loopstack/pull/240) [`743209b`](https://github.com/loopstack-ai/loopstack/commit/743209bee73cdc598c4a1d73f1387e42b77b79f8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `loopstack list <workflow>` shows what a workflow expects: description, owning app, an arguments table (name, type, required, default — from the workflow's zod schema), and a copy-pasteable `run` example. `--json` returns the raw schema.

- [#240](https://github.com/loopstack-ai/loopstack/pull/240) [`39a6d4f`](https://github.com/loopstack-ai/loopstack/commit/39a6d4f1f6bed625c2f93b80bb473f912dc73f7b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Chat prompts work in the terminal: workflow-level `prompt-input` widgets (from `@Workflow({ widget })`) are discovered via the workflow config, render as a labeled input, and submit the raw message string the transition schema expects — chat-loop workflows like `prompt_input_chat_example` now converse round after round, in fresh and reattached sessions.

### Patch Changes

- [#240](https://github.com/loopstack-ai/loopstack/pull/240) [`e5f90da`](https://github.com/loopstack-ai/loopstack/commit/e5f90da6412b4cf15bc91c0d47d7e93c6e49c78d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Version line realigned to 0.16.x — continuing above the pre-rewrite 0.15.x releases so the newest version also reads as the highest.

- [#240](https://github.com/loopstack-ai/loopstack/pull/240) [`cdf44e9`](https://github.com/loopstack-ai/loopstack/commit/cdf44e9a3a85c4ecb4b89c71f9c5733493e60f55) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Output polish: followed runs print their Studio deep link right at the top, `--detach` output includes the `resume with: loopstack runs <id> --follow` hint, and `list` spreads its columns with minimum widths plus spacing before the summary line.

- Updated dependencies [[`e5f90da`](https://github.com/loopstack-ai/loopstack/commit/e5f90da6412b4cf15bc91c0d47d7e93c6e49c78d)]:
  - @loopstack/client@0.37.1

## 0.1.0

### Minor Changes

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`9bbdca3`](https://github.com/loopstack-ai/loopstack/commit/9bbdca307e9c954b19e6eff12985e5443d7829a2) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Human-in-the-loop prompts land in the terminal: when a followed run parks in waiting, the CLI finds the prompt (searching sub-workflows — the root often only holds a link document), renders it by widget type (`text-prompt` free text, `confirm-prompt` y/n, `choices` numbered with custom answers, `form` action buttons, plus a raw transition picker fallback), and submits the answer against the prompting workflow so the run resumes seamlessly. Non-interactive shells print the question and exit 3. New commands: `loopstack trace <runId>` renders the audit trail from checkpoints (consecutive state saves collapsed into steps with durations) and `--follow` live-attaches with the same prompt handling — including runs already waiting when you attach; `loopstack watch` streams the environment's events with `--workflow`/`--type` filters, as NDJSON under `--json`.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`94890b9`](https://github.com/loopstack-ai/loopstack/commit/94890b9364406e47e79bda04cad1dfbd1f4b7d3d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Command grammar alignment: `runs` lists recent runs with waiting-for-input runs surfaced first (`--search`, `--status`, `--workspace`, `--limit`) and `runs <run-id>` shows a run's audit trail (`--follow` reattaches live and answers prompts, replacing `trace`); `list` now shows the workflows you can run in the environment; `run --detach` replaces `--no-follow`.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`6cf0949`](https://github.com/loopstack-ai/loopstack/commit/6cf0949b7c0dd6209e9bc2f9a1359ffb1eaffdc0) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Run polish and Studio deep links: `--arg key=@-` reads the value from stdin, `run --quiet` prints only the final result, and environments can carry a Studio URL (`login` prompt / `--studio-url` / `LOOPSTACK_STUDIO_URL`, local fallback `http://localhost:5173`) — when known, detach output, waiting-for-input messages, failure output, and `runs --json` include deep links into Studio, and `--open` (on `run` and `runs <run-id>`) opens the run in the browser.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`2f37cea`](https://github.com/loopstack-ai/loopstack/commit/2f37ceac3d13380b7e25ff5b8e57e11b0b598897) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `loopstack run <workflow>` starts a run and follows it live: step lines per place with durations, LLM tokens streamed inline, and a final status line. `--arg key=value` (repeatable, JSON-ish coercion) and `--arg key=@file.json` supply workflow args; the workspace is resolved automatically (newest workspace of the workflow's app, created on demand) or pinned via `--workspace`. `--no-follow` fires and prints the run id; `--json` keeps stdout machine-readable (progress on stderr) and emits `{ workflowId, status, result, errorMessage, durationMs }`. Exit codes: 0 completed, 1 failed, 2 unknown workflow or connection problems, 3 waiting for input.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`9b77727`](https://github.com/loopstack-ai/loopstack/commit/9b777275a086cdf56618063ec6bf41d81c5f9e6a) Thanks [@jakobklippel](https://github.com/jakobklippel)! - New `@loopstack/cli` package — the `loopstack` terminal command over `@loopstack/client`. `loopstack login` saves named backend environments to `~/.loopstack/config.json` (written user-only; tokens optional — local no-auth backends need none), `loopstack env list|use` manages them, and `loopstack list` shows recent runs as a table or `--json`. Connection resolution precedence: `--url`/`--env`/`--token` flags, then `LOOPSTACK_URL`/`LOOPSTACK_TOKEN`, then the config default, then local dev fallback. Errors follow the CI exit-code contract (2 for connection/config problems) with friendly messages for unreachable backends and rejected tokens.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`3ce670d`](https://github.com/loopstack-ai/loopstack/commit/3ce670dd69ab391cba85a43c3ef7662fb828f8ba) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Studio handoff round-trip for human-in-the-loop prompts: the CLI stays attached while a prompt is open, so an answer given in Studio aborts the terminal prompt (`✓ answered in Studio`) and following resumes — for reattached sessions too. Forms with input fields hand off to Studio via deep link instead of submitting an empty payload; without a Studio URL, or with `--editor`, the payload opens in `$EDITOR` (schema-seeded JSON, reopened on invalid input). Ctrl+D on an open prompt now exits 3 instead of crashing.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`ccdc85a`](https://github.com/loopstack-ai/loopstack/commit/ccdc85af0c6ae73901a455be1bad5502328369a4) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `loopstack create <dir>` scaffolds a new Loopstack app: NestJS boilerplate via `nest new`, `LoopstackModule.forRoot()` wiring, a zero-config hello workflow (deterministic — no API keys needed), docker-compose for Postgres/Redis/Studio, `.env.example`, and git init. `--skip-install` and `--no-git` flags supported.

### Patch Changes

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`338ca4c`](https://github.com/loopstack-ai/loopstack/commit/338ca4ceabcb4746077e3496f4ea7a7425a29387) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `loopstack create` scaffolds a `CLAUDE.md` into the new app — project structure, workflow/tool/document conventions, and the CLI feedback loop (`list` → `run` → `runs`), so coding agents start primed.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`f2c9016`](https://github.com/loopstack-ai/loopstack/commit/f2c90160b97c4fd19430a3c30a9d7fb80fd03c3b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Docs for `loopstack create` in the README and CLI reference: the scaffold quickstart (docker compose up, start:dev, first run) and the `--skip-install`/`--no-git` flags.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845) Thanks [@jakobklippel](https://github.com/jakobklippel)! - HITL prompt discovery and workspace resolution use `client.config.apps()` instead of locally-typed HTTP calls.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`0c032f3`](https://github.com/loopstack-ai/loopstack/commit/0c032f3cbf92ae29e849859f628d761c1dc956c7) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Workspace resolution for `run` uses `client.workspaces` with a server-side `appName` filter instead of fetching a page of workspaces and filtering locally.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`d56d6ee`](https://github.com/loopstack-ai/loopstack/commit/d56d6ee9c2e10d886e1f9af2fa029b84fca71755) Thanks [@jakobklippel](https://github.com/jakobklippel)! - README and docs: command reference, connection resolution, HITL prompt behavior, `--json` output contract, and the CI exit-code table (0 completed / 1 failed / 2 connection-config / 3 waiting for input).

- Updated dependencies [[`0c032f3`](https://github.com/loopstack-ai/loopstack/commit/0c032f3cbf92ae29e849859f628d761c1dc956c7), [`2f48470`](https://github.com/loopstack-ai/loopstack/commit/2f48470ff10ecb1b07a877adacfc312a20b1e061), [`2f37cea`](https://github.com/loopstack-ai/loopstack/commit/2f37ceac3d13380b7e25ff5b8e57e11b0b598897), [`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`fcd617f`](https://github.com/loopstack-ai/loopstack/commit/fcd617ffb4af881c4352437cecf91b250ff5904b), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841), [`69e8a13`](https://github.com/loopstack-ai/loopstack/commit/69e8a131922392b77bdbb9b5e31e577f60b57479), [`c89852c`](https://github.com/loopstack-ai/loopstack/commit/c89852cb10298489f69307b3cacdea31ec02894c)]:
  - @loopstack/contracts@0.37.0
  - @loopstack/client@0.37.0
