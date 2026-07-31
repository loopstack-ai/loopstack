---
'@loopstack/common': minor
'@loopstack/core': minor
---

Tool result contracts: `@Tool({ resultSchema })` declares a Zod schema for the tool's result, validated on `envelope.data` of every success envelope at the tool pipeline's single exit — covering live results, interceptor-transformed envelopes, and replayed test fixtures identically. Error and pending envelopes are exempt; the field is optional. New `parseToolResult()` and `getBlockResultSchema()` utilities in `@loopstack/common`. `BaseTool.complete()` no longer has a passthrough fallback — async tools that can succeed must implement `complete()` explicitly; the base implementation throws with a named error.
