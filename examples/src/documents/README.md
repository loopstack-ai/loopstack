---
title: Documents Examples
description: Runnable Loopstack examples for documents — the built-in document types, a tool that declares a document on its result envelope, and a keyed revision kept live with meta.invalidate.
---

# Documents Examples

> Document examples for the [Loopstack](https://loopstack.ai) automation framework.

Documents are what a workflow shows in Studio and keeps in its run. These examples show how they are saved: by a workflow, by a tool, and as revisions under a key. None of them calls an LLM, so they run without a provider key.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/common @loopstack/core
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { DocumentsExamplesModule } from './documents/documents-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), DocumentsExamplesModule],
})
export class AppModule {}
```

## Examples

| Example                           | Studio title                         | Description                                                                 |
| --------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| [UI Documents](#ui-documents)     | `Documents - UI Documents Example`   | Smoke test for built-in document types (Message, Error, Markdown, Plain)    |
| [Tool Documents](#tool-documents) | `Documents - Tool Documents Example` | A tool that declares a document on its result envelope instead of saving it |
| [Keep Revision](#keep-revision)   | `Documents - Keep Revision Example`  | A keyed revision that stays live when later saves reuse its key             |

---

## UI Documents

A small workflow that saves one of each built-in document type so you can verify Studio renders them correctly.

### Files

- `ui-documents-example.workflow.ts`

## Tool Documents

Demonstrates a tool that produces a document without writing it:

- `ReceiptTool` (`create_receipt`) — totals a list of items and returns the total as `data`. It returns the receipt in `documents` on its result envelope: the document name, the content, and the same options as `documentStore.save()`. It gets the name with `resolveDocumentName(ReceiptDocument)`, so the name always matches the registered class.
- `ReceiptDocument` (`receipt`) — a registered `@Document` that Studio renders as Markdown. A declared document must be a registered `@Document`. Otherwise the tool call fails with `Unknown document`.
- The workflow only calls the tool and publishes the total. It saves no document itself: the tool pipeline saves the declared receipt after the call.

The pipeline saves declared documents after any interceptor or replay. So a replayed call saves the documents of its recorded envelope, as a live call would. The spec shows both: a live run saves the receipt the tool built, and a replayed run saves the receipt from the recording.

### Files

- `tool-documents-example.workflow.ts`
- `tools/receipt.tool.ts`
- `documents/receipt-document.ts`

## Keep Revision

`KeepRevisionExampleWorkflow` — a save with a `key` that an earlier document already uses invalidates the earlier revisions, so only the latest is live. A revision saved with `meta: { invalidate: false }` is the exception: later saves under its key leave it live.

The workflow saves three messages under the key `answer`:

1. The first answer, with `meta: { invalidate: false }`.
2. A draft answer, without the flag.
3. The final answer, without the flag.

The final save invalidates the draft but not the first answer, so Studio shows the first and the final answer. The flag protects the revision it is saved with. It does not change what a later save does to other revisions. The spec asserts which revisions are live.

### Files

- `keep-revision-example.workflow.ts`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
