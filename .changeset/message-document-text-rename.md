---
'@loopstack/common': minor
'@loopstack/llm-provider-module': patch
'@loopstack/loopstack-studio': patch
'@loopstack/accessing-tool-results-example-workflow': patch
'@loopstack/agent-example-workflow': patch
'@loopstack/code-agent-example-workflow': patch
'@loopstack/custom-tool-example-module': patch
'@loopstack/delegate-error-example-workflow': patch
'@loopstack/dynamic-routing-example-workflow': patch
'@loopstack/error-retry-example-workflow': patch
'@loopstack/git-commit-flow-example-workflow': patch
'@loopstack/mcp-linear-example-workflow': patch
'@loopstack/module-config-example': patch
'@loopstack/remote-file-explorer-example-workflow': patch
'@loopstack/run-sub-workflow-example': patch
'@loopstack/sandbox-example-workflow': patch
'@loopstack/test-ui-documents-example-workflow': patch
'@loopstack/workflow-state-example-workflow': patch
---

`MessageDocument`'s field is renamed `content: string` → `text?: string` so it lines up with `LlmMessageDocument`, and its default tag changes from `['message']` to `['ui-message']`. The tag change means a `MessageDocument` is no longer picked up by LLM history collection (`messagesSearchTag` defaults to `'message'`) — plain UI bubbles stop leaking into the conversation context. `LlmMessageDocument` now extends `MessageDocument` for a shared base; its exposed fields (`role`, `text`, `blocks`, `stopReason`, `id`) are unchanged. To restore the old behaviour and feed a `MessageDocument` into LLM history, save it with explicit `tags: ['message']`.
