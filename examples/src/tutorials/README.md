---
title: Tutorial Examples
description: Runnable source of the Loopstack tutorials — the Human-in-the-Loop approval tutorial's meeting-notes workflow with MeetingNotesDocument and OptimizedNotesDocument form documents, wait transitions, LlmGenerateObjectTool structured output, a Handlebars prompt template, and its replay and live specs.
---

# Tutorial Examples

> The finished code of the [Loopstack](https://loopstack.ai) tutorials, built and tested with the rest of the examples.

Each directory here is the code a tutorial builds, step by step. Use it to compare your own code with the finished version, or to run the flow before you start. The other example modules each show one feature; a tutorial combines several features in one flow.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/claude @loopstack/common @loopstack/llm-provider
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { TutorialsExamplesModule } from './tutorials/tutorials-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), TutorialsExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

The Meeting Notes workflow calls `LlmGenerateObjectTool` from `@loopstack/llm-provider`. That module is `@Global` and must be configured once in your root module:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { TutorialsExamplesModule } from './tutorials/tutorials-examples.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }),
    TutorialsExamplesModule,
  ],
})
export class AppModule {}
```

## Environment

The Meeting Notes workflow requires Claude credentials:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Examples

| Example                         | Studio title                       | Tutorial                                                                      |
| ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| [Meeting Notes](#meeting-notes) | `Tutorial - Meeting Notes Example` | [Human-in-the-Loop Approval Workflow](/docs/tutorials/hitl-approval-workflow) |

---

## Meeting Notes

The workflow from the [Human-in-the-Loop Approval Workflow](/docs/tutorials/hitl-approval-workflow) tutorial:

1. Save a `MeetingNotesDocument` with the raw notes as an editable form, and wait
2. The user edits the notes and clicks **Optimize Notes** — a `wait: true` transition
3. `LlmGenerateObjectTool` extracts the structured notes, constrained by a Zod schema
4. Save an `OptimizedNotesDocument` for the user to review, and wait
5. The user clicks **Confirm** — a second `wait: true` transition publishes the confirmed notes as the workflow result

### Files

- `meeting-notes/meeting-notes.workflow.ts` — workflow class
- `meeting-notes/documents/meeting-notes-document.{ts,yaml}` — input form document
- `meeting-notes/documents/optimized-notes-document.{ts,yaml}` — structured output document
- `meeting-notes/templates/extract-notes.md` — LLM prompt template

The tutorial registers the workflow in its own `MeetingNotesModule`. Here, `TutorialsExamplesModule` registers it.

### Tests

- `meeting-notes.spec.ts` — `replay` scripts the LLM response and `answers` drives the two review steps. Runs with `npm test`, with no API key.
- `meeting-notes.live.spec.ts` — the same flow against the real model, with structural assertions. Runs with `npm run test:live` and needs `ANTHROPIC_API_KEY`.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
