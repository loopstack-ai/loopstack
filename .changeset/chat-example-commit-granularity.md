---
'@loopstack/hitl-examples': patch
---

The prompt-input chat example stores the user's message and generates the reply in separate transitions (`userMessage` → `generateReply`): each transition commits its own transaction, so the message renders immediately and the LLM turn streams after it — the pattern documented in Best Practices under "Commit user input before slow work". The greeting is an `LlmMessageDocument` like every other chat turn, so it renders uniformly and joins the conversation history the provider builds.
