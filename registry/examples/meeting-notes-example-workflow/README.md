---
title: Meeting Notes Example
description: Example building a human-in-the-loop AI workflow — interactive documents, review steps, LLM-generated meeting notes with user approval
---

# @loopstack/meeting-notes-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to build human-in-the-loop AI workflows with interactive documents and review steps.

## Overview

The Meeting Notes Example Workflow shows how to create workflows that pause for user input and allow users to review and edit AI-generated content. It takes unstructured meeting notes and uses AI to extract structured information like date, participants, decisions, and action items.

By using this workflow as a reference, you'll learn how to:

- Use `wait: true` transitions to pause workflows for user input
- Create interactive documents with action buttons
- Handle transition payloads from user interactions
- Transform unstructured text into structured data with AI using `LlmGenerateObjectTool`
- Build review-and-confirm patterns for AI outputs
- Define workflow input schemas via the `@Workflow` decorator
- Use the document repository to save and update documents

This example is essential for developers building workflows that require human oversight or approval steps.

## Installation

```bash
npm install @loopstack/meeting-notes-example-workflow
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { MeetingNotesExampleModule, MeetingNotesWorkflow } from '@loopstack/meeting-notes-example-workflow';

@StudioApp({
  title: 'Meeting Notes Example',
  workflows: [MeetingNotesWorkflow],
})
@Module({
  imports: [MeetingNotesExampleModule],
})
export class MyAppModule {}
```

Set your Anthropic API key as an environment variable:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## How It Works

### Workflow Flow

1. **Start** - User provides unstructured meeting notes via the input form
2. **Wait for Input** - User can edit the notes, then clicks "Optimize Notes"
3. **AI Processing** - Claude extracts structured information into a formatted document
4. **Review** - User reviews and can edit the structured output
5. **Confirm** - User clicks "Confirm" to finalize

### Key Concepts

#### 1. Workflow Input Schema

Define input parameters directly in the `@Workflow` decorator with a Zod schema:

```typescript
@Workflow({
  uiConfig: __dirname + '/meeting-notes.ui.yaml',
  schema: z.object({
    inputText: z
      .string()
      .default(
        '- meeting 1.1.2025\n- budget: need 2 cut costs sarah said\n- hire new person?? --> marketing\n- vendor pricing - follow up needed by anna',
      ),
  }),
})
export class MeetingNotesWorkflow extends BaseWorkflow<{ inputText: string }> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }
}
```

#### 2. Waiting Transitions

Use `wait: true` with a `schema` to pause the workflow and wait for user interaction. The schema validates the `data` submitted by the user; the method receives a `TransitionInput<TData>` envelope:

```typescript
@Transition({ from: 'waiting_for_response', to: 'response_received', wait: true, schema: MeetingNotesDocumentSchema })
async userResponse(state, input: TransitionInput<z.infer<typeof MeetingNotesDocumentSchema>>) {
  const result = await this.documentStore.save(MeetingNotesDocument, input.data, { key: 'input' });
  this.meetingNotes = result.content as z.infer<typeof MeetingNotesDocumentSchema>;
}
```

The workflow pauses at `waiting_for_response` until the user submits data via the document button.

#### 3. Document Actions with Buttons

Add action buttons to documents that trigger transitions. These are defined in the document's YAML config:

```yaml
# meeting-notes-document.yaml
type: document
ui:
  widgets:
    - widget: form
      options:
        properties:
          text:
            title: Text
            widget: textarea
        actions:
          - type: button
            transition: userResponse
            label: 'Optimize Notes'
```

When clicked, the button triggers the `userResponse` transition with the current document content as the payload.

#### 4. Custom Document Schemas

Define document content schemas using the `@Document` decorator with a Zod schema:

```typescript
export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@Document({
  schema: MeetingNotesDocumentSchema,
  uiConfig: __dirname + '/meeting-notes-document.yaml',
})
export class MeetingNotesDocument {
  text: string;
}
```

#### 5. Structured Output Documents

Define complex document schemas for structured AI output:

```typescript
export const OptimizedMeetingNotesDocumentSchema = z.object({
  date: z.string(),
  summary: z.string(),
  participants: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(z.string()),
});

@Document({
  schema: OptimizedMeetingNotesDocumentSchema,
  uiConfig: __dirname + '/optimized-notes-document.yaml',
})
export class OptimizedNotesDocument {
  date: string;
  summary: string;
  participants: string[];
  decisions: string[];
  actionItems: string[];
}
```

Configure the document UI with ordering, collapsible arrays, and confirm button:

```yaml
# optimized-notes-document.yaml
type: document
ui:
  widgets:
    - widget: form
      options:
        order: [date, summary, participants, decisions, actionItems]
        properties:
          date: { title: Date }
          summary: { title: Summary, widget: textarea }
          participants: { title: Participants, collapsed: true, items: { title: Participant } }
          decisions: { title: Decisions, collapsed: true, items: { title: Decision } }
          actionItems: { title: Action Items, collapsed: true, items: { title: Action Item } }
        actions:
          - type: button
            transition: confirm
            label: 'Confirm'
```

#### 6. AI Document Generation

Use `LlmGenerateObjectTool` to extract structured data from unstructured text. The `outputSchema` is derived from the document's Zod schema via `toJSONSchema`, and provider/model are passed at call time:

```typescript
@Transition({ from: 'response_received', to: 'notes_optimized' })
async optimizeNotes(state: MeetingNotesState) {
  const result = await this.llmGenerateObject.call(
    {
      outputSchema: toJSONSchema(OptimizedMeetingNotesDocumentSchema) as Record<string, unknown>,
      prompt: this.render(__dirname + '/templates/extract-notes.md', {
        text: state.meetingNotes?.text,
      }),
    },
    { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
  );

  const objectResult = result.data as LlmGenerateObjectResult;
  await this.documentStore.save(
    OptimizedNotesDocument,
    objectResult.data as z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
    { key: 'final', validate: 'skip' },
  );
}
```

#### 7. Final Confirmation with Wait

Use terminal `@Transition` with `wait: true` to create a review step before the workflow ends:

```typescript
@Transition({ from: 'notes_optimized', to: 'end', wait: true, schema: OptimizedMeetingNotesDocumentSchema })
async confirm(state, input: TransitionInput<z.infer<typeof OptimizedMeetingNotesDocumentSchema>>) {
  const result = await this.documentStore.save(OptimizedNotesDocument, input.data, { key: 'final' });
  this.optimizedNotes = result.content as z.infer<typeof OptimizedMeetingNotesDocumentSchema>;
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework decorators (`BaseWorkflow`, `@Workflow`, `@Transition`, `@Document`)
- `@loopstack/llm-provider-module` - Provides `LlmGenerateObjectTool` for structured AI output

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
