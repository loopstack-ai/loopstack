---
title: Testing Examples
description: Runnable workflow-testing examples for Loopstack — runWorkflow() in-process workflow tests with scripted HITL answers, testTool() tool unit tests, and record/replay fixtures with drift warnings. Companion package to the Testing guide.
---

# @loopstack/testing-examples

> Runnable testing examples for the [Loopstack](https://loopstack.ai) automation framework — the patterns from the [Testing guide](https://loopstack.ai/docs/build/testing) as working code.

The example under test is a small deterministic triage flow (`src/triage/`): a `classify_ticket` tool grades a support ticket, the workflow reports the severity as a document, then waits for human approval.

## What each spec demonstrates

| Spec                             | Pattern                                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `classify-ticket.tool.spec.ts`   | **Tool unit test** — `testTool().forTool(...)`, assert on the envelope data                                                                                    |
| `triage-ticket.workflow.spec.ts` | **In-process workflow test** — `runWorkflow()` with scripted `answers`, assertions on `status`, `path`, `result`, `document()`, and the parked (waiting) state |
| `triage-ticket-replay.spec.ts`   | **Record/replay** — a committed fixture (`__recordings__/triage.json`) replayed via `replay()`, plus an inline fixture object                                  |

Run them:

```bash
npm test
```

## Recording fixtures from live runs

Fixtures are derived from real runs, not written by hand:

```bash
LOOPSTACK_RECORD_TOOL_CALLS=true npm run start:dev   # backend with tool-call recording
loopstack run triage_ticket --arg text="Production is down!"
loopstack runs <run-id> --record src/triage/__tests__/__recordings__/triage.json
```

Replay is transition-scoped: recordings are matched by the transition they were captured in, then consumed in sequence. When the outgoing args drift from the recording, a warning is logged — the signal to re-validate live and re-record.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
