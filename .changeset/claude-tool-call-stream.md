---
'@loopstack/claude-module': minor
---

The Claude provider emits `tool_call` stream events when a `tool_use` content block completes, so clients (Studio, CLI) can render tool calls live during the turn instead of waiting for the persisted message document.
