---
title: Testing Workflows and Tools
description: How to test Loopstack workflows and tools — runWorkflow() in-process workflow tests with scripted HITL answers and inline sub-workflows, testTool() unit tests, record/replay of tool responses (recordToolCalls, loopstack runs --record, replay()), live-LLM regression tests, and CI smoke runs with loopstack run --json. Covers @loopstack/testing, TestRun assertions (status, path, result, document), replay fixtures, drift warnings, and current replay limitations.
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

Dependencies are added with `.withProvider(MyService)`, mocked with `.withMock(MyService, { ... })`, and tool dependencies stubbed with `.withToolMock(OtherTool)`.

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
- `answers` — scripted HITL input, keyed by wait-transition method name. Whenever the run (or an inline sub-workflow) parks on a matching wait transition, the answer is submitted as its input `data`. Without a matching answer the parked run is returned, so you can also assert on the waiting state itself.
- `replay` — recorded tool responses (next section). Omit it and tools run live.

Sub-workflows started with `this.someWorkflow.run(...)` execute **inline**: children run to completion synchronously, their callbacks fire, and the whole composition finishes in one call. Child runs are available on `run.children` (status, result, documents per child). Fan-out children run sequentially in tests.

## Record and replay tool responses

Replay makes non-deterministic tools — above all LLM calls — deterministic: the recorded response envelope is returned instead of executing the tool. Your code, transitions, and assertions all run for real; only the tool boundary is replayed. A failing replay test means _your code_ changed behavior, not the model.

The recording flow uses the run you already made:

```bash
# 1. Run the backend with tool-call recording enabled (debug mode)
LOOPSTACK_RECORD_TOOL_CALLS=true npm run start:dev
#    …or in code: LoopstackModule.forRoot({ recordToolCalls: true })

# 2. Run the workflow for real
loopstack run triage_ticket --arg text="Production is down!"

# 3. Derive a replay fixture from the run's recorded tool calls
loopstack runs <run-id> --record src/triage/__tests__/__recordings__/triage.json
```

Commit the fixture and replay it in tests:

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

Recordings are matched by the **transition** they were recorded in, then consumed in sequence within that transition — robust against reordered or conditional transitions. When the outgoing args drift from the recording (for example after a prompt change), a **drift warning** is logged: the test stays deterministic, but you are told the fixture may be stale. Tools with no recordings for a transition run live; an exhausted recording list is an error.

### Current replay boundaries

- Replay short-circuits the tool's `handle()`, so documents a tool creates _internally_ (for example the LLM message documents saved by `llm_generate_text`) do not reappear in a replayed run. Assert on envelope-derived state — `run.result`, `run.path`, documents your own transitions save — not on tool-internal side effects.
- Async tools that launch sub-workflows and return a `pending` envelope (`ask_clarification`, `ask_for_approval`, `request_secrets`, `explore_task`) are not reliably replayable yet: the replayed envelope references a child that was never launched. Test such workflows with `answers` against live tool execution instead.

## Live-LLM regression tests

Replay proves your code; it deliberately cannot prove the _model_ still behaves after you change a prompt or switch models. For that, run the same tests live — just omit `replay`:

```ts
const run = await runWorkflow(TriageTicketWorkflow, { text: ticket }); // real providers

expect(run.status).toBe('completed');
expect(['high', 'normal']).toContain(run.result.severity); // tolerant, structural assertions
expect(run.document('triage_report')).toBeDefined();
```

Live tests are non-deterministic and cost money: keep assertions structural (path taken, schema shape, allowed value sets, key facts present), run them **on demand** after prompt/model changes or nightly — never in the PR gate. The loop closes neatly: a replay **drift warning** in CI is your signal that fixtures are stale → run the live tests → when green, re-record the fixtures with `--record`.

## Smoke runs in CI

End-to-end verification of a deployed backend needs no test framework — the CLI is the CI gate:

```bash
loopstack run triage_ticket --arg text=@ticket.txt --json
```

One final JSON object on stdout, progress on stderr, and the exit-code contract: `0` completed, `1` failed, `2` connection/config error, `3` parked waiting for input. A handful of these smoke runs verifies the wiring; the dozens of behavior tests belong in the inner loop.

## Where to look next

- Runnable versions of every pattern on this page: the [`@loopstack/testing-examples`](https://loopstack.ai/registry) registry package.
- Design guidance on what to test where: [Best Practices](/docs/build/best-practices).
- CLI flags and exit codes: [CLI reference](/docs/reference/cli).
