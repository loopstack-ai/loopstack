---
'@loopstack/llm-provider-module': minor
---

LLM tools declare result contracts: `LlmGenerateTextResultSchema`, `LlmGenerateObjectResultSchema`, `LlmDelegateResultSchema` (with `LlmToolResultEntrySchema` / `LlmToolErrorEntrySchema`) are exported and wired as `resultSchema` on `llm_generate_text`, `llm_generate_object`, `llm_delegate_tool_calls`, and `llm_update_tool_result` — hand-written replay fixtures are now validated against the real message contract. The delegate skips `complete()` entirely for failed or canceled sub-workflows and returns the error envelope directly; `complete()` results are validated against the tool's `resultSchema`.
