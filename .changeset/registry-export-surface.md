---
'@loopstack/mcp-module': minor
'@loopstack/claude-module': minor
'@loopstack/agent': patch
'@loopstack/code-agent': patch
---

Registry feature packages export what their public API documents, and nothing else.

- `@loopstack/mcp-module`: `McpClientLike`, `McpTransportLike`, `McpClientCtor` and `McpTransportCtor` are no longer
  exported.
- `@loopstack/claude-module`: `ClaudeGenerateOptions` and `ClaudeToolDefinition` are no longer exported.
- `@loopstack/agent`: exports `AgentFinishResultSchema` and `AgentFinishResult`, the result of `AgentFinishTool`.
- `@loopstack/code-agent`: exports `ExploreTaskResultSchema`, the result schema of `ExploreTask`.
