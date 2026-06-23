---
'@loopstack/llm-provider-module': minor
'@loopstack/agent': patch
'@loopstack/delegate-error-example-workflow': patch
'@loopstack/github-oauth-example': patch
'@loopstack/google-oauth-example': patch
'@loopstack/secrets-example-workflow': patch
---

`LlmDelegateToolCallsToolSchema.callback` is now required. The previous synchronous loop pattern (no callback, guard-only) silently hung the moment any tool returned `pending: true` — typical for sub-workflow tools and HITL tools. Requiring `callback` at the schema level forces every caller to wire up the `wait: true` self-loop transition that handles async completions via `LlmUpdateToolResultTool`. The `tool-call-example-workflow` example, which demonstrated the unsafe synchronous pattern, has been removed; use `@loopstack/agent` (via `AgentWorkflow.run()`) for standard tool calling, or see `delegate-error-example-workflow` as a reference for hand-rolled loops with custom error handling.
