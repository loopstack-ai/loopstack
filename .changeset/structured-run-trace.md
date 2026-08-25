---
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/api': minor
'@loopstack/client': minor
'@loopstack/testing': minor
'@loopstack/cli': minor
'@loopstack/loopstack-module': minor
---

Structured run trace: every workflow run produces a canonical, append-only event journal — `transition.started/completed/failed` (with duration and per-key state diff), `tool.called/completed/failed` (with args and envelope; failing tool calls are now recorded), `document.emitted`, `child.queued/settled`, and `run.settled` on every park and terminal settle. The trace rides `WorkflowMetadataInterface.trace` and, for stateless runs, the resume carrier — a resumed run's trace is complete across park/resume with continuous ordering. `TestRun` gains `trace` and `toolCalls`; `path` derives from the trace's terminal transition events. Trace persistence is opt-in per run: `loopstack run --trace` (or `trace: true` on the start payload) persists the run tree's events as `core_run_trace_event` rows with full payloads, the `trace` module option / `LOOPSTACK_TRACE=true` enables it globally — absorbing the tool-call audit table. `GET /workflows/:id/tool-calls` and `loopstack runs --record` are backed by trace events with an unchanged response contract; `seq` is monotonic per run in both stateless and DB mode. `WorkflowRunner.runSync` stateless results carry `trace` instead of `history`.
