---
title: Testing Methodology
description: How to turn acceptance criteria into an executable workflow test suite — criterion-named scenarios as the human-reviewable contract, the criteria matrix as a test-report query, three run modes (hermetic replay, live, record) from one spec via the fixture option, choosing check types by determinism class (mechanical, semantic, effectful, interactive), and completeness via coverage() and parkView() assertions. Conventions over framework code — works with plain vitest and @loopstack/testing.
---

# Testing Methodology

[Testing](/build/testing) documents the tools — `runWorkflow`, replay fixtures, scripted answers, `parkView()`. This page documents the **method**: how to organize those tools so a workflow's test suite is a faithful, checkable translation of its acceptance criteria. This matters doubly when the workflow author is an AI agent: for an agent, tests are perception — the suite is how it knows it is done, and how you know it understood the task. Everything here is convention over plain vitest; there is no scenario DSL to learn.

## Criteria become scenarios, scenarios become tests

Start from the acceptance criteria — stated ones, plus the unstated ones every task carries (error paths, rejection paths, the branch nobody mentioned). Give each a short ID and expand it into scenarios: happy path, every branch, every park, every failure mode. Each scenario is one `it()` whose name starts with the criterion ID:

```ts
describe('ExpenseApprovalWorkflow — acceptance', () => {
  it('C1: expenses under €100 auto-approve without human interaction', async () => {
    const run = await runWorkflow(
      ExpenseApprovalWorkflow,
      { amount: 40 },
      {
        fixture: rec('small-expense.json'),
      },
    );
    expect(run.status).toBe('completed');
    expect(run.path).not.toContain('managerDecision'); // never parked
    expect(run.result).toMatchObject({ approved: true, auto: true });
  });

  it('C2: expenses of €100+ park for the manager, amount visible', async () => {
    const run = await runWorkflow(
      ExpenseApprovalWorkflow,
      { amount: 250 },
      {
        fixture: rec('large-expense.json'),
      },
    );
    expect(run.status).toBe('waiting');
    const view = run.parkView();
    expect(view?.widget).toBe('confirm-prompt');
    expect(view?.content).toMatchObject({ question: expect.stringContaining('€250') });
  });

  it("C3: rejection records the manager's reason", async () => {
    const run = await runWorkflow(
      ExpenseApprovalWorkflow,
      { amount: 250 },
      {
        fixture: rec('large-expense.json'),
        answers: { managerDecision: { approved: false, reason: 'no receipt' } },
      },
    );
    expect(run.result).toMatchObject({ approved: false, reason: 'no receipt' });
  });
});
```

This file is the **contract**. A reviewer reads the `it()` names top to bottom and confirms the task was understood — before or after implementation, without deciphering test internals. Write the scenarios first, as failing tests, and let the workflow's design follow from what they need to script: every LLM call and external effect ends up behind a seam (`replayTools`, config) because the scenarios demand it.

Assert **outcomes**, not mechanics: `result`, `documents`, where the run parked, what the user would see (`parkView()`). Avoid asserting internal call sequences — those tests break on refactors that change nothing observable. `run.trace` is for debugging a divergence, not for routine assertions.

## The criteria matrix is a test-report query

With criterion IDs in test names, the criterion → scenario → result matrix needs no tooling:

- The test report _is_ the matrix — every `C*:` line shows pass/fail, grouped by workflow.
- "Is every criterion covered?" is a grep: a criterion ID that appears in the task but not in any test name is uncovered.
- "Is every _path_ covered?" is a query: `coverage(runs, WorkflowClass)` reports declared transitions and parks no scenario exercised — criteria coverage and state-machine coverage are different questions; check both.

## One scenario, three run modes

A scenario written against `fixture` runs in all three modes without changes:

| Mode         | How                                                           | When                                                        |
| ------------ | ------------------------------------------------------------- | ----------------------------------------------------------- |
| **Hermetic** | fixture exists → replayed, milliseconds, no keys              | The default. CI gate, every local run                       |
| **Record**   | fixture missing (non-CI) → tools run live, responses captured | First run, and re-recording after intended behavior changes |
| **Live**     | separate spec without `fixture`, sampled, rubric-asserted     | Rare, deliberate — semantic quality regression checks       |

Drift protection keeps the modes honest: replayed runs assert recorded args/config against the live call and validate envelopes against `resultSchema` — a stale fixture fails loudly instead of proving nothing.

## Pick the check type by determinism class

A workflow's correctness decomposes into classes, each with a different right kind of check — blurring them into one integration test produces something flaky, slow, and vague at once:

| Class       | What                                  | Check                                                                                                                                         |
| ----------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanical  | wiring, data flow, schemas, documents | Exact assertions on `result`/`path`/`document()` under replay                                                                                 |
| Semantic    | quality of LLM output                 | Structural assertions under replay; live sampled runs for quality                                                                             |
| Effectful   | external writes (git push, email)     | Replay inside the suite — tools marked `effects: 'external'` never run live in the inner loop; contract checks against the real service shape |
| Interactive | HITL behavior                         | Scripted `answers` (+ `failure()` for failing children, `TestClock` for timeouts), `parkView()` for what the user sees                        |

## Checklist

1. Extract criteria (including failure modes); assign IDs.
2. Write criterion-named scenarios as failing tests; review them with a human — this is the cheap moment to resolve ambiguity.
3. Implement until the hermetic suite is green; unit-test tools with real logic via `testTool()`.
4. Run `coverage()` — close the gaps it names.
5. Record fixtures from good live runs; commit them.
6. Hand off with the test report: every criterion visibly green, park views asserted for every human touchpoint.
