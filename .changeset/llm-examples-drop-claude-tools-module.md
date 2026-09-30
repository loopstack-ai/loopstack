---
'@loopstack/llm-examples': patch
---

Drop the unused `@loopstack/claude-tools-module` dependency. `LlmExamplesModule` no longer imports
`ClaudeToolsModule`; none of its workflows use a tool from it.
