---
'@loopstack/llm-provider-module': minor
---

Remove `LlmGenerateTextToolSchema`, `LlmGenerateObjectToolSchema` and `LlmToolsHelperService.getTools()` from
`@loopstack/llm-provider-module`.

The args schemas of the generate tools are exported as `LlmGenerateTextArgsSchema` and
`LlmGenerateObjectArgsSchema`, with their config in `LlmGenerateTextConfigSchema` and
`LlmGenerateObjectConfigSchema`. Tool definitions for the LLM are built with
`LlmToolsHelperService.getToolDefinitions(tools: BaseTool[])`.
