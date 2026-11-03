# @loopstack/testing

Test [Loopstack](https://loopstack.ai) tools and workflows in ordinary vitest tests — the real workflow engine runs in-process, with no Postgres, no Redis, and no backend. Script human-in-the-loop answers, replay recorded tool responses for deterministic regression tests, and assert on the status, path, result, documents, and full trace of every run.

```bash
npm install -D @loopstack/testing
```

## Test a tool with `testTool`

`testTool()` compiles a minimal module with the framework tokens mocked:

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

## Test a workflow with `runWorkflow`

`runWorkflow()` executes the real state machine and returns an assertable run:

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

Pass `fixture: '<path>.json'` to record tool responses on the first run and replay them on every run after. The package also exports `createContractFake()` for tool fakes validated against the tool's `resultSchema`, `coverage()` for state-machine coverage across a set of runs, and `diffTraces()` to find the first point where two runs diverge.

Full documentation: [Testing Workflows and Tools](https://loopstack.ai/docs/build/testing) · [Testing Methodology](https://loopstack.ai/docs/build/testing-methodology).
