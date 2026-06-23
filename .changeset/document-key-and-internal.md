---
'@loopstack/common': minor
'@loopstack/contracts': minor
'@loopstack/core': minor
'@loopstack/api': minor
'@loopstack/llm-provider-module': minor
'@loopstack/agent': patch
'@loopstack/hitl': patch
'@loopstack/oauth-module': patch
'@loopstack/chat-example-workflow': patch
'@loopstack/github-oauth-example': patch
'@loopstack/google-oauth-example': patch
'@loopstack/hitl-example-module': patch
'@loopstack/meeting-notes-example-workflow': patch
'@loopstack/prompt-example-workflow': patch
'@loopstack/prompt-structured-output-example-workflow': patch
'@loopstack/secrets-example-workflow': patch
---

Cleanup of the `documentStore.save` options taxonomy. Three related changes:

**1. `id` → `key` (rename).** `DocumentSaveOptions.id` is now `key`, and the underlying entity field/column moved from `messageId` / `message_id` to `key`. The option is used for non-message documents too (forms, transcripts, status docs), so the LLM-flavored name was misleading — `key` accurately names the concept (stable upsert key that invalidates the previous row in place). Synchronize mode handles the column rename; no migration shipped.

**2. New `internal` decorator option + entity column.** `@Document({ internal: true })` marks a document type as framework plumbing. Internal documents are persisted server-side and still readable by code that queries the document store (e.g. LLM providers building conversation history), but they're excluded from REST API responses — Studio never sees them. The filter is applied at the API boundary (`DocumentApiService.findAll` / `findOneById`); the repository itself stays unfiltered so server-side callers compose their own queries. `StaticDocumentMeta.hidden` is gone — it was the half-measure this replaces.

**3. New `LlmContextDocument` type.** Symmetric with `LlmMessageDocument` (`{ role: 'user' | 'assistant', text }`) but declared `@Document({ internal: true, tags: ['message'] })`. The `'message'` tag keeps it in the LLM provider's conversation-history gather; `internal: true` keeps it out of Studio. Replaces the prior `{ meta: { hidden: true } }` flag on `LlmMessageDocument` saves — 9 call sites across `@loopstack/agent`, sandbox/app-builder, and registry examples migrated to the new type.

**Migration:**

```ts
// before
await this.documentStore.save(Doc, content, { id: 'status' });
await this.documentStore.save(LlmMessageDocument, { role: 'user', text }, { meta: { hidden: true } });

// after
await this.documentStore.save(Doc, content, { key: 'status' });
await this.documentStore.save(LlmContextDocument, { role: 'user', text });
```
