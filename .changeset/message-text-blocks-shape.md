---
'@loopstack/contracts': minor
'@loopstack/llm-provider-module': minor
'@loopstack/claude-module': patch
'@loopstack/openai-module': patch
'@loopstack/agent': patch
'@loopstack/loopstack-studio': patch
'@loopstack/chat-example-workflow': patch
'@loopstack/delegate-error-example-workflow': patch
'@loopstack/github-oauth-example': patch
'@loopstack/google-oauth-example': patch
'@loopstack/llm-multi-provider-example-workflow': patch
'@loopstack/prompt-structured-output-example-workflow': patch
'@loopstack/secrets-example-workflow': patch
'@loopstack/tool-call-example-workflow': patch
---

`LlmNormalizedMessage` exposes `text: string` as the plain-text projection (always populated by providers) and `blocks?: LlmContentBlock[]` as the structured form. `LlmMessageDocument` and inline `LlmMessage` args accept either field — `text` for plain content, `blocks` for structured blocks like tool results. Read `result.message.text` to get a guaranteed string; iterate `result.message.blocks` to inspect tool calls, thinking output, or render block-by-block.
