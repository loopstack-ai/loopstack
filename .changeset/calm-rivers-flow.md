---
'@loopstack/ai-module': patch
'@loopstack/claude-module': patch
'@loopstack/oauth-module': patch
'@loopstack/create-chat-message-tool': patch
---

Migrate registry modules from core-ui-module to core and enhance tool call tracking

- Replace @loopstack/core-ui-module dependency with @loopstack/core across all registry modules
- Add tool call extraction (ToolCallEntry/ToolCallsMap) to ai-module and claude-module
- Refactor claude-module to use StateMachineToolCallProcessorService for tool execution
- Update effects API from single object to array of ToolSideEffects
