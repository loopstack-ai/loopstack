---
title: Documents Examples
description: Workflow examples for documents in Loopstack — saving the built-in document types (Message, Error, Markdown, Plain) and seeing how Studio renders each.
---

# @loopstack/documents-examples

> Document workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Documents are how a workflow says anything to a human: `documentStore.save(<DocumentClass>, content)` appends
one to the run's stream, and the document _type_ is what Studio keys its renderer off. This example saves one
of each built-in type in a single transition, so you can see all four renderings side by side.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/documents-examples src/documents-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { DocumentsExamplesModule } from './documents-examples/documents-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), DocumentsExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/documents-examples
```

```typescript
import { DocumentsExamplesModule } from '@loopstack/documents-examples';
```

No provider modules, secrets or environment variables are needed.

## Examples

| Example                       | Studio title                       | Run                               |
| ----------------------------- | ---------------------------------- | --------------------------------- |
| [UI Documents](#ui-documents) | `Documents - UI Documents Example` | `loopstack run test_ui_documents` |

---

## UI Documents

One transition, four saves — one per built-in document type:

| Document class     | Content shape    | Renders as            |
| ------------------ | ---------------- | --------------------- |
| `MessageDocument`  | `{ role, text }` | a chat message bubble |
| `ErrorDocument`    | `{ error }`      | an error callout      |
| `MarkdownDocument` | `{ markdown }`   | rendered markdown     |
| `PlainDocument`    | `{ text }`       | unformatted text      |

Run it in Studio to confirm all four render correctly — that is the point of the example, and the reason it
doubles as a rendering smoke test.

### Files

- `workflows/ui-documents/ui-documents-example.workflow.ts`

## Tests

```bash
npm test
```

The spec asserts one document per type with that type's own content shape.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
