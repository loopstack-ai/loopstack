---
'@loopstack/loopstack-studio': minor
---

Run View gap closures: `secret-input` and `oauth-prompt` join the prompt registry as run-view-native components (secrets upsert via the workspace API before the transition fires with the saved keys; OAuth popup flow submitting `{ code, state }` with status short-circuits and retry). The transcript now renders feature-registered document renderers as inert history instead of the JSON fallback, and in-flight LLM messages stream token-by-token via tree-wide `llm.response.*` accumulation — the persisted message replaces the stream when it lands.
