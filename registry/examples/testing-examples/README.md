---
title: Testing Examples
description: Runnable workflow-testing examples for Loopstack — runWorkflow() in-process workflow tests with scripted HITL answers, parkView() park assertions, coverage() gates, testTool() tool unit tests, fixture auto record/replay, and createContractFake() DI fakes. Companion package to the Testing guide.
---

# @loopstack/testing-examples

> Runnable testing examples for the [Loopstack](https://loopstack.ai) automation framework — the patterns from the [Testing guide](https://loopstack.ai/docs/build/testing) and [Testing Methodology](https://loopstack.ai/docs/build/testing-methodology) as working code.

The example under test is a small deterministic triage flow (`src/triage/`): a `classify_ticket` tool grades a support ticket, the workflow presents the severity as a yes/no approval prompt, then waits for the human decision. No LLM — the whole flow is deterministic, so every test is exact.

Scenarios are named for the acceptance criterion they check (`it('C1: …')`), so the test report reads as a criteria matrix — the discipline from the methodology guide.

## What each spec demonstrates

| Spec                                  | Pattern                                                                                                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `classify-ticket.tool.spec.ts`        | **Tool unit test** — `testTool().forTool(...)`, assert on the envelope data (the `resultSchema` is validated by `call()`)                                                                                         |
| `triage-ticket.workflow.spec.ts`      | **In-process workflow test** — `runWorkflow()` with scripted `answers`; outcome assertions on `status`/`path`/`result`/`document()`; `parkView()` for the human touchpoint; a `coverage()` gate closing the suite |
| `triage-ticket-replay.spec.ts`        | **Record/replay** — the `fixture:` option (auto record/replay, CI-guarded) as the default, plus an inline `replay()` fixture for fully-scripted determinism                                                       |
| `triage-ticket-contract-fake.spec.ts` | **Contract fake** — `createContractFake()` substitutes the tool with a `resultSchema`-validated response and asserts how the workflow called it                                                                   |

Run them:

```bash
npm test
```

## Recording fixtures from live runs

The `fixture:` option records a fresh fixture when the file is missing and replays it when present. Record one from a real run:

```bash
npm run start:dev                                    # start the backend
loopstack run triage_ticket --arg text="Production is down!" --trace
loopstack runs <run-id> --record src/triage/__tests__/__recordings__/triage.json
```

Replay is transition-scoped: recordings are matched by the transition they were captured in, then consumed in sequence. Each entry's metadata (`tool`, `workflow`, `transition`, `args`, and `config` when present) is **asserted** against the actual call — when the outgoing args or config drift from the recording the run **fails** with a drift error naming the tool and both values, the signal to re-validate live and re-record. In CI a missing fixture is an error (not a silent live run) unless `LOOPSTACK_RECORD=1` is set.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
