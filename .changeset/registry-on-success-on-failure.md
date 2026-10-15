---
'@loopstack/agent': patch
'@loopstack/code-agent': patch
'@loopstack/code-workspace': patch
'@loopstack/github-integration': patch
'@loopstack/hitl': patch
'@loopstack/llm-provider': patch
'@loopstack/secrets': patch
---

Sub-workflow callers name `onSuccess` and, where a failure is handled, `onFailure`. The tools that launch a sub-workflow forward the caller's `onSuccess`, `onFailure` and `metadata` options. The LLM tool-call loop points both at one transition, so a failed tool still becomes a `tool_result` the model can read.
