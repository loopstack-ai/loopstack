---
"@loopstack/contracts": minor
"@loopstack/llm-provider-module": minor
"@loopstack/cli": minor
"@loopstack/loopstack-studio": minor
---

Message completion metadata and quieter system messages

Assistant messages can carry optional completion `meta` — model, token usage, cost, turns, and duration:

- `@loopstack/contracts` adds `UIUsage` / `UIMessageMeta` and a `meta` field on `UIMessage`.
- `@loopstack/llm-provider-module`'s `LlmMessageDocument` carries the `meta`.
- The CLI (`llm-message` widget) and Studio (`LlmMessage`) render a dim completion-stats footer when a
  message has `meta`.
- System messages now render as compact status lines (a single info icon, no card or per-message emoji)
  instead of full message cards.
