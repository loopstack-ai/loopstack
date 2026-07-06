---
'@loopstack/contracts': minor
---

Add `@loopstack/contracts/events` — a zod-first discriminated union (`ClientMessageSchema`) typing every event on the client event stream (`workflow.*`, `document.created`, `secret.*`, `git.updated`, `llm.response.*`, `stream.reset`), with inferred types, `parseClientMessage`/`isClientMessage`/`isLlmResponseEvent` helpers, and `LlmNormalizedMessageSchema`. `workflow.updated` now carries the workflow `status` inline.
