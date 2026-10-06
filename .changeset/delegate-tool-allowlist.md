---
'@loopstack/llm-provider-module': minor
'@loopstack/agent': patch
---

`llm_delegate_tool_calls` executes only the tools the LLM was offered.

- `@loopstack/llm-provider-module`: `LlmDelegateToolCallsToolSchema` requires `tools: string[]`, the same names passed
  to `llm_generate_text` as `config.tools`. A tool call whose name is not in `tools` is never resolved or executed.
  It comes back to the LLM as an error tool result: `Tool "x" is not available to this agent`.
- `@loopstack/agent`: `AgentWorkflow` and `ChatAgentWorkflow` pass their tools list to the delegate.
  `ChatAgentWorkflow` includes `agent_finish` in task mode.
