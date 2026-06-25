---
'@loopstack/agent': patch
'@loopstack/llm-provider-module': minor
'@loopstack/agent-examples': patch
'@loopstack/hitl-examples': patch
'@loopstack/llm-examples': patch
'@loopstack/oauth-examples': patch
'@loopstack/secrets-examples': patch
---

`LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, and `LlmUpdateToolResultTool` now persist their messages to the document store automatically — the assistant turn after `llmGenerateText`, and the `tool_result` user turn once all delegated tools have completed (sync or async). Two new config fields control this:

- `save?: boolean` (default `true`) — pass `false` to opt out when you want to inspect, transform, or persist the response yourself (e.g. prefixing the text with a provider name for side-by-side comparison).
- `meta?: Record<string, unknown>` — merged into the auto-saved document's metadata. Common use: `{ meta: { hidden: true } }` to keep a message in the LLM's conversation history while hiding it from the Studio UI.

**Migration:** if your workflow already saves `result.data!.message` / `state.llmResult!.message` manually, drop the call — you'll otherwise persist the same document twice. Author-constructed messages (`{ role: 'user', text }`, system seeds, transformed responses) stay manual.

All registry examples and the built-in `AgentWorkflow` / `ChatAgentWorkflow` updated to drop their manual saves. Three sync-only tool-calling workflows (`tool-call-example-workflow`, `explore-registry-package-agent`, `search-registry-agent`) had their state graphs simplified — `awaiting_tools` intermediate state, `toolsComplete` transition, and `allToolsComplete` guard are gone since they were only needed for the now-automatic save. Async workflows (with `callback: { transition: ... }`) keep that structure for callback re-entry.

The new typed config schemas on `LlmDelegateToolCallsTool` / `LlmUpdateToolResultTool` also surface a previously-silent bug: workflows passing `{ config: { provider: 'claude' } }` to those tools (the field was never accepted; it was discarded under the prior `object` config type). Affected example call sites have been cleaned up.
