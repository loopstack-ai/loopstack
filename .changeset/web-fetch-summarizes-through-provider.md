---
'@loopstack/web-module': minor
'@loopstack/quota': minor
---

`web_fetch` summarizes through the LLM provider layer and is metered by quota.

- When called with a `prompt`, `WebFetchTool` summarizes with the provider from its new optional `provider` arg, else
  the `LlmProviderModule` default provider, else `claude`. The model is the `model` arg, else `CLAUDE_WEB_FETCH_MODEL`,
  else `claude-haiku-4-5-20251001`; pass `model` when summarizing with a provider other than `claude`.
- A summarized result returns `{ provider, model, usage }` as `LlmResultMeta` metadata, and the run's abort signal is
  forwarded to the provider call.
- `WebModule` depends on `@loopstack/llm-provider-module` and no longer imports `ClaudeModule`: import
  `LlmProviderModule` and a provider module (`ClaudeModule`, `OpenAiModule`) alongside it.
- `QuotaModule` registers the `llm-cost` calculator for `WebFetchTool`, so summarization cost counts toward the
  `llm-cost` quota.
