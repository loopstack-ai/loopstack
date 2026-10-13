---
'@loopstack/claude': patch
---

The Claude provider returns the result of every Anthropic server tool as a `server_tool_result` block, with
`toolUseId` and the block's `content`. This covers web search, web fetch, code execution (`code_execution`,
`bash_code_execution`, `text_editor_code_execution`) and tool search, so a workflow reads, for example, the stdout of
code Claude ran from a typed block, and Studio shows each server tool call with its result.
