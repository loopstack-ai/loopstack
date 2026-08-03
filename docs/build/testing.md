---
title: Testing Workflows and Tools
description: How to test Loopstack workflows and tools — runWorkflow() in-process workflow tests with scripted HITL answers (queue() for cyclic workflows), provider overrides, contract-validated tool fakes (createContractFake) and tool mocks (createToolMock), state-machine coverage (coverage), trace diffing (diffTraces), and inline sub-workflows; testTool() unit tests; strict-sequence record/replay of tool responses (the fixture option with automatic record/replay and CI guard, record, the replayTools mock boundary, the --trace flag and LOOPSTACK_TRACE, loopstack runs --record --tools, replay()); live-LLM regression tests; and CI smoke runs with loopstack run --json. Covers @loopstack/testing, TestRun assertions (status, path, result, document, recordings, the run trace via trace and toolCalls), replay fixtures as ordered response scripts with metadata assertions, drift detection, resultSchema contract validation of replayed envelopes, replay boundaries (pending envelopes, async tools always live), and the three strategies for scripting an async tool's answer.
---

# Testing Workflows and Tools

Loopstack workflows are state machines, and state machines are testable: given the same args and the same tool responses, a run takes the same path and produces the same result. `@loopstack/testing` builds on exactly that property. This page is the whole testing story on one page — unit tests for tools, in-process tests for workflows, recorded tool responses for deterministic regression tests, live runs for LLM regressions, and smoke runs for CI.

The model has two layers:

- **Inner loop** — ordinary vitest tests that run the real workflow engine in-process: no Postgres, no Redis, no backend. Tool responses can be replayed from recordings, so tests are fast and deterministic. This is where workflow logic, tool logic, and internal regressions are tested.
- **Outer loop** — real runs against a running backend with real providers: the `loopstack` CLI for manual and CI smoke runs, and on-demand live-LLM tests after prompt or model changes.

## Testing tools with `testTool`

A tool is a unit: given args and context, `handle()` returns an envelope. `testTool()` compiles a minimal module with the framework tokens mocked:

```ts
import { testTool } from '@loopstack/testing';
import { ClassifyTicketTool } from '../classify-ticket.tool';

it('classifies an outage as high severity', async () => {
  const module = await testTool().forTool(ClassifyTicketTool).compile();
  const tool = module.get(ClassifyTicketTool);

  const result = await tool.call({ text: 'Production is down!' });

  expect(result.data).toMatchObject({ severity: 'high' });
});
```

Dependencies are added with `.withProvider(MyService)`, mocked with `.withMock(MyService, { ... })`, and tool dependencies stubbed with `.withToolMock(OtherTool)` — stubbed calls reject until a response is scripted with `mockResolvedValue(...)`.

## Testing workflows with `runWorkflow`

`runWorkflow()` executes the real state machine in-process and returns a rich, assertable run object:

```ts
import { runWorkflow } from '@loopstack/testing';
import { ClassifyTicketTool } from '../classify-ticket.tool';
import { TriageTicketWorkflow } from '../triage-ticket.workflow';

it('triages a ticket and completes after approval', async () => {
  const run = await runWorkflow(
    TriageTicketWorkflow,
    { text: 'Production is down!' },
    {
      providers: [ClassifyTicketTool],
      answers: { approve: { approved: true } }, // scripted HITL answer
    },
  );

  expect(run.status).toBe('completed');
  expect(run.path).toEqual(['classify', 'report', 'approve']); // executed transitions, in order
  expect(run.result).toMatchObject({ severity: 'high', approved: true });
  expect(run.document('triage_report')).toMatchObject({ role: 'assistant' });
});
```

What the options do:

- `providers` / `imports` — the workflow's dependencies (tools, sub-workflow classes, feature modules), exactly as in its real module.
- `overrides` — replace providers that come from imported modules: `overrides: [[LlmGenerateTextTool, myMock]]`. A plain `providers` entry only shadows tokens the workflow itself injects; `overrides` reaches into imported modules.
- `answers` — scripted HITL input, keyed by wait-transition method name. A plain value is submitted every time the run (or an inline sub-workflow, at any nesting depth — an agent flow's parent → agent → ask-user chain included) parks on the matching wait transition; `queue('first', 'second')` submits one value per park and then stops, which is how a cyclic workflow (a chat loop) is driven a known number of turns before parking. Without an applicable answer the parked run is returned, so you can also assert on the waiting state itself. A plain answer that keeps re-applying on a cyclic workflow trips the `maxSteps` guard (default 50) with an error pointing to `queue()`.
- `fixture` / `replay` / `record` — scripted tool responses (next section). Omit them and tools run live.
- `replayTools` — the mock boundary: which tools consume the scripted responses. Omit it (or pass `'*'`) to mock every tool — right for simple workflows. Agent flows declare the LLM explicitly (`replayTools: [LlmGenerateTextTool]`) so the delegation and HITL machinery runs live. Tools outside the boundary always execute for real and are never captured.

Tools can also be **mocked** instead of run live or replayed: pass `{ provide: MyTool, useValue: createToolMock('MyTool') }` in `providers` (or via `overrides` for tools from imported modules) and script responses with `mockResolvedValue({ data: ... })`. You hold the mock reference, so interaction assertions like `expect(mock.call).toHaveBeenCalledWith(...)` work directly. Unscripted mock calls fail the run loudly. Note that a mock bypasses the tool pipeline entirely — args validation, `resultSchema` result validation, interceptors, and replay never see a mocked tool. Prefer `createContractFake(MyTool)` over a plain mock: it scripts responses with `returns(...)` / `returnsOnce(...)` and validates every scripted envelope against the tool's declared `resultSchema` at scripting time, so a fake that drifts from the real contract fails the test instead of silently passing. Interaction assertions work the same (`expect(fake.call).toHaveBeenCalledWith(...)`); unscripted calls reject loudly.

Sub-workflows started with `this.someWorkflow.run(...)` execute **inline**: children run to completion synchronously, their callbacks fire, and the whole composition finishes in one call. Child runs are available on `run.children` (status, result, documents per child). Fan-out children run sequentially in tests.

Beyond `path`, the run object carries the full **run trace** — the ordered event journal of everything the run did: `run.trace` holds every `transition.started/completed/failed` (with duration and a per-key state diff), `tool.called/completed/failed` (with args and envelope), `document.emitted`, `child.queued/settled`, and one `run.settled` per park or terminal settle (parks include the transitions the run waited on). `run.toolCalls` is the tool-call view of the same trace. `path` derives from the trace's terminal transition events, so it lists transitions that actually executed — successes and failures alike, one entry per attempt; use `run.trace` when a test needs to distinguish outcomes or assert on timings, diffs, or the exact failure point.

Two helpers turn traces into answers. `coverage(runs, WorkflowClass)` reports state-machine coverage — which declared transitions and parks a set of runs actually exercised (`missingTransitions` / `missingParks` / `complete`), so "did my tests cover every path?" is a query, not a feeling. `diffTraces(expected, actual)` compares two traces by behavioral identity (timings, sequence numbers, and generated keys are ignored) and returns the **first divergence** with both events and the differing field — or `null` when the runs did the same thing.

## Record and replay tool responses

Replay makes non-deterministic tools — above all LLM calls — deterministic: the recorded response envelope is returned instead of executing the tool. Your code, transitions, and assertions all run for real; only the tool boundary is replayed. A failing replay test means _your code_ changed behavior, not the model.

The default flow is the `fixture` option — one file, automatic record/replay:

```ts
const run = await runWorkflow(
  TriageTicketWorkflow,
  { text: 'Production is down!' },
  {
    providers: [ClassifyTicketTool],
    answers: { approve: { approved: true } },
    fixture: join(import.meta.dirname, '__recordings__/triage.json'),
  },
);
```

When the file is missing, the run executes tools live and records it — captured at the exact interception point replay later uses, so the fixture is guaranteed to fit. When the file is present, the run replays it. Delete the file to re-record (for example after a drift failure), then commit the refreshed fixture. In CI (`CI` env set), a missing fixture is an **error** instead of a live run — recording is a deliberate local act, and an uncommitted fixture must never silently turn the PR gate into a live LLM call. Set `LOOPSTACK_RECORD=1` to explicitly allow recording in CI.

For explicit control there are two lower-level options, mutually exclusive with `fixture` and with each other: `record` (a path, or `true` to only expose the capture on `run.recordings`) always records, and `replay` always replays a given source — a file path or an inline fixture object.

**Recording from a real run** — when the fixture should reflect exactly what a deployed backend produced (a trust run, an agent-driven run):

```bash
# 1. Run the workflow for real with trace persistence on (--trace covers the whole run tree)
loopstack run triage_ticket --arg text="Production is down!" --trace

# 2. Derive a replay fixture from the run's recorded tool calls
loopstack runs <run-id> --record src/triage/__tests__/__recordings__/triage.json
```

Trace persistence is off by default — `--trace` enables it per run. To record every run (e.g. on a dev backend), enable it globally with `LOOPSTACK_TRACE=true` or `LoopstackModule.forRoot({ trace: true })`.

Replay the committed fixture in tests:

```ts
import { replay, runWorkflow } from '@loopstack/testing';

const run = await runWorkflow(
  TriageTicketWorkflow,
  { text: 'Production is down!' },
  {
    providers: [ClassifyTicketTool],
    answers: { approve: { approved: true } },
    replay: replay(join(import.meta.dirname, '__recordings__/triage.json')),
  },
);
```

The fixture is a **strict, ordered script**: each call inside the mock boundary consumes the next response — there is no matching or lookup, exactly like an ordinary mock's response queue. Each entry's metadata (`tool` always; `workflow`, `transition`, `args`, `config` when present) is **asserted** against the actual call, so a drifted call order, position, argument, or config fails loudly with the exact position named — a replayed run is deterministic, and any deviation from the recorded sequence means your code changed behavior. A completed run must consume the whole script; leftover responses fail too. Recording covers the **whole run tree** in call order: sub-workflow calls carry their own workflow's name, both in-process and when deriving from a backend run (`loopstack runs <root-run-id> --record` fetches the root's and every descendant's calls; `--tools llm_generate_text` selects the mock boundary at derivation). When the outgoing args **or config** drift from the recording, the run **fails** with a drift error naming the tool, transition, and both values — and because LLM tools receive their system prompt, model, and tool list via `config`, a changed system prompt now fails the replayed test instead of silently passing against a stale fixture. A replayed response that no longer matches what your code sends proves nothing, so the fixture must be re-recorded before the test is trustworthy. Args and config are compared structurally (object key order does not matter); a hand-written fixture entry that omits `config` simply doesn't assert it. Fixtures are `version: 3` — older versions are rejected with a re-record message. Tools with no recordings for a transition run live; an exhausted recording list is an error.

Replayed envelopes are also **contract-validated**: when a tool declares a `resultSchema`, the scripted response's `data` is parsed against it at the same pipeline point as a live result. A hand-written or stale fixture whose shape no longer matches what the tool really returns fails the run with an error naming the tool — a fixture that drifts from reality proves nothing, so fix the fixture, never loosen the schema.

### Replay boundaries

- Replay short-circuits the tool's `handle()`, so documents a tool creates _internally_ (for example the LLM message documents saved by `llm_generate_text`) do not reappear in a replayed run. Assert on envelope-derived state — `run.result`, `run.path`, documents your own transitions save — not on tool-internal side effects.
- **Pending envelopes cannot enter a fixture.** When an async tool (`ask_clarification`, `ask_for_approval`, `request_secrets`, `explore_task`) launches a sub-workflow, its `pending` envelope is a _reference_ to that live child, not a result — replaying it would hand the workflow a claim ticket for a child that was never launched, and the run would wait forever. So the guard is loud everywhere: in-process recording **fails** when a boundary tool returns a pending envelope (narrow `replayTools` to leave the async tool out), `loopstack runs --record` skips pending envelopes and reports how many, and `replay()` refuses to load a fixture containing one. The consequence: **async tools always execute for real in a replayed run.** How to control their answers is covered in the next section.
- **Agent flows declare the LLM as the boundary.** The delegation machinery (`llm_delegate_tool_calls`, `llm_update_tool_result`) returns plain data envelopes that are entangled with live pending-tool state — its response is a _receipt for work performed_, and replaying a receipt doesn't perform the work: the agent parks forever. The LLM is the only genuine data source, so it is the boundary:

```ts
const run = await runWorkflow(AgentClarificationExampleWorkflow, undefined, {
  fixture: join(import.meta.dirname, '__recordings__/agent-clarification.json'), // scripted LLM turns
  replayTools: [LlmGenerateTextTool], // everything else runs live
  answers: { userAnswered: { answer: 'Budget €2000, warm climate' } }, // nested HITL child
});
```

The replayed LLM turn returns the `ask_clarification` tool_use → delegation runs live → the ask-user child launches inline and parks → the scripted answer resumes it → the next replayed LLM turn completes the flow. Deterministic, no API key, and the real HITL and delegation machinery is exercised.

### Scripting an async tool's answer

An async tool's answer is never replayed from the fixture — it always comes from one of three sources, and each one is scriptable. Pick the strategy by where the answer originates:

1. **A human answers** (`ask_clarification`, `ask_for_approval`, `request_secrets`) → script the human with `answers`. The tool runs live and launches its ask-user child inline; the child parks; your scripted answer resumes it; the tool's `complete()` transforms the child result into the tool result — the entire HITL machinery is exercised for real, and the answer is whatever the test scripts:

   ```ts
   answers: {
     userAnswered: {
       answer: 'Budget €2000, warm climate';
     }
   }
   ```

2. **An LLM answers** (`explore_task` — its result comes from a sub-agent) → replay reaches _inside_ the child instead. Recording covers the whole run tree in call order, so the sub-agent's own `llm_generate_text` turns are part of the script. With `replayTools: [LlmGenerateTextTool]` the tool runs live, launches the real sub-agent, and the sub-agent's inner LLM calls consume the script — the tool's answer reproduces deterministically from its actual source of nondeterminism.

3. **You want the tool gone entirely** → mock it wholesale via `providers` or `overrides`. The mock returns a plain _data_ envelope, so the tool never goes async and no child machinery is involved:

   ```ts
   const explore = createToolMock('explore_task');
   explore.call.mockResolvedValue({ data: { summary: 'Three call sites, all in core.' } });
   // providers: [{ provide: ExploreTaskTool, useValue: explore }]
   ```

What is deliberately not supported: replaying the pending envelope itself and fabricating the completion — that would require hand-reimplementing the callback delivery and `complete()` transformation the replay skipped. Strategy 3 expresses that intent in one line instead.

## Live-LLM regression tests

Replay proves your code; it deliberately cannot prove the _model_ still behaves after you change a prompt or switch models. For that, run the same tests live — just omit `replay`:

```ts
const run = await runWorkflow(TriageTicketWorkflow, { text: ticket }); // real providers

expect(run.status).toBe('completed');
expect(['high', 'normal']).toContain(run.result.severity); // tolerant, structural assertions
expect(run.document('triage_report')).toBeDefined();
```

Live tests are non-deterministic and cost money: keep assertions structural (path taken, schema shape, allowed value sets, key facts present), run them **on demand** after prompt/model changes or nightly — never in the PR gate. The loop closes neatly: a replay **drift failure** in CI is your signal that fixtures are stale → run the live tests → when green, re-record the fixtures with `--record`.

## Smoke runs in CI

End-to-end verification of a deployed backend needs no test framework — the CLI is the CI gate:

```bash
loopstack run triage_ticket --arg text=@ticket.txt --json
```

One final JSON object on stdout, progress on stderr, and the exit-code contract: `0` completed, `1` failed, `2` connection/config error, `3` parked waiting for input. A handful of these smoke runs verifies the wiring; the dozens of behavior tests belong in the inner loop.

## Where to look next

- Runnable versions of every pattern on this page: the [`@loopstack/testing-examples`](https://loopstack.ai/registry) registry package; every HITL and agent flavor tested side by side: [`@loopstack/hitl-examples`](https://loopstack.ai/registry).
- Design guidance on what to test where: [Best Practices](/docs/build/best-practices).
- CLI flags and exit codes: [CLI reference](/docs/reference/cli).
