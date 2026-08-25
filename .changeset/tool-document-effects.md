---
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/llm-provider-module': minor
---

Tools produce documents by declaring them on the result envelope (`documents: [{ documentName, content, options }]`) instead of writing inside `handle()`. The tool pipeline applies declarations through the document store after the interceptor chain — success envelopes only, a failing save fails the call — so replayed test fixtures materialize the same documents a live run would. The three LLM tools (`llm_generate_text`, `llm_delegate_tool_calls`, `llm_update_tool_result`) now declare their message documents; recordings made before this change carry no declarations, so re-record fixtures to see tool-produced documents under replay. Adds `ToolDocumentDeclaration`/`ToolDocumentDeclarationSchema` (common) and `resolveDocumentClass` (core).
