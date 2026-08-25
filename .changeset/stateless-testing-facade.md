---
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/api': minor
'@loopstack/client': minor
'@loopstack/testing': minor
---

In-process workflow testing: stateless runs now record their transition `history`, park-and-resume via a `statelessState` carrier (scripted HITL answers without persistence), and execute sub-workflows inline with automatic callback delivery. `@loopstack/testing` gains the `runWorkflow()` / `testTool()` / `replay()` facade with transition-scoped tool-response replay and drift warnings. Debug-mode tool-call auditing (`core_tool_call_record`) with a `GET /workflows/:id/tool-calls` endpoint and `client.workflows.toolCalls()` powers replay fixture recording.
