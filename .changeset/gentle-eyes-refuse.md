---
'@loopstack/llm-provider-module': patch
'@loopstack/loopstack-studio': patch
---

Consume the typed `ClientMessage` events from `@loopstack/contracts/events`: the LLM stream dispatch constructs typed `llm.response.*` events (dropping the redundant `eventType` field), `LlmNormalizedMessageSchema` is sourced from contracts, and Studio's SSE handling uses the shared event types instead of local duplicates.
