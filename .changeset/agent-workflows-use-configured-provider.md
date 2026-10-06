---
'@loopstack/agent': patch
---

`AgentWorkflow` and `ChatAgentWorkflow` use the configured LLM provider.

- Each LLM turn resolves the provider and model from the `LlmProviderModule` config in scope: the one passed to
  `AgentModule.forFeature({ llm })` (or `CodeAgentModule.forFeature({ llm })`), else the app-wide one. With no
  provider configured, `claude` is used.
- Both workflows accept optional `provider` and `model` args to override the configured ones for a single run.
