---
'@loopstack/claude-module': minor
'@loopstack/claude-tools-module': minor
---

Name the two Claude web search tools after how they are used.

- `@loopstack/claude-module` exports `ClaudeNativeWebSearchTool` (`claude_native_web_search`), with
  `ClaudeNativeWebSearchToolConfig` and `ClaudeNativeWebSearchToolConfigSchema`. It is Claude's provider-native
  web search: list it in an agent's or LLM call's `tools`, and Claude searches inside that call.
- `@loopstack/claude-tools-module` exports `ClaudeWebSearchStepTool` (`claude_web_search_step`), with
  `ClaudeWebSearchStepArgs`, `ClaudeWebSearchStepConfig` and their schemas. It is a workflow step that makes its
  own Claude request through `claude_native_web_search` and returns the hits and commentary.

To give an agent web search, list `claude_native_web_search` in its `tools`:

```ts
await this.llmGenerateText.call({}, { config: { provider: 'claude', tools: ['claude_native_web_search'] } });
```

`claude_web_search_step` always sends its request to the `claude` provider and does not save the reply as a
conversation message, so a search adds nothing to the workflow's history.
