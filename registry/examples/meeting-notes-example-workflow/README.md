# @loopstack/meeting-notes-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to build human-in-the-loop AI workflows with manual triggers and interactive documents.

## Overview

The Meeting Notes Example Workflow shows how to create workflows that pause for user input and allow users to review and edit AI-generated content. It takes unstructured meeting notes and uses AI to extract structured information like date, participants, decisions, and action items.

By using this workflow as a reference, you'll learn how to:

- Use manual triggers to pause workflows for user input
- Create interactive documents with action buttons
- Handle transition payloads from user interactions via `runtime.transition.payload`
- Transform unstructured text into structured data with AI
- Build review-and-confirm patterns for AI outputs
- Use `@State` to manage workflow state with schemas
- Use `@Input` to define workflow arguments and document content schemas

This example is essential for developers building workflows that require human oversight or approval steps.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/meeting-notes-example-workflow
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/meeting-notes-example-workflow
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```

### 2. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `MeetingNotesExampleModule` to the imports of `default.module.ts` or any other custom module.
- Inject the `MeetingNotesWorkflow` workflow to your workspace class using the `@InjectWorkflow()` decorator.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

## How It Works

### Workflow Flow

1. **Start** - User provides unstructured meeting notes via the input form
2. **Wait for Input** - User can edit the notes, then clicks "Optimize Notes"
3. **AI Processing** - LLM extracts structured information into a formatted document
4. **Review** - User reviews and can edit the structured output
5. **Confirm** - User clicks "Confirm" to finalize

### Key Concepts

#### 1. Workflow Input and State

Define input parameters with `@Input` and workflow state with `@State`:

```typescript
@Input({
  schema: z.object({
    inputText: z
      .string()
      .default(
        '- meeting 1.1.2025\n- budget: need 2 cut costs sarah said\n...',
      ),
  }),
})
args: {
  inputText: string;
};

@State({
  schema: z.object({
    meetingNotes: MeetingNotesDocumentSchema.optional(),
    optimizedNotes: OptimizedMeetingNotesDocumentSchema.optional(),
  }),
})
state: {
  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
  optimizedNotes?: z.infer<typeof OptimizedMeetingNotesDocumentSchema>;
};
```

#### 2. Manual Triggers

Use `trigger: manual` to pause the workflow and wait for user interaction:

```yaml
- id: user_response
  from: waiting_for_response
  to: response_received
  trigger: manual
```

The workflow pauses at `waiting_for_response` until the user triggers the transition.

#### 3. Document Actions with Buttons

Add action buttons to documents that trigger transitions. These are defined in the document's YAML config:

```yaml
# meeting-notes-document.yaml
type: document
ui:
  form:
    properties:
      text:
        title: Text
        widget: textarea
  actions:
    - type: button
      widget: button
      transition: user_response
      options:
        label: 'Optimize Notes'
```

When clicked, the button triggers the `user_response` transition with the current document content.

#### 4. Transition Payloads

Access user input from the transition payload using `runtime.transition.payload`:

```yaml
- id: user_response
  from: waiting_for_response
  to: response_received
  trigger: manual
  call:
    - id: create_response
      tool: createDocument
      args:
        id: input
        document: meetingNotesDocument
        update:
          content: ${{ runtime.transition.payload }}
      assign:
        meetingNotes: ${{ result.data.content }}
```

The `runtime.transition.payload` contains the document content when the user clicked the button. The result is saved to workflow state via `assign`.

#### 5. Custom Document Schemas

Define document content schemas using `@Input` on the `content` property:

```typescript
export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@Document({
  configFile: __dirname + '/meeting-notes-document.yaml',
})
export class MeetingNotesDocument implements DocumentInterface {
  @Input({
    schema: MeetingNotesDocumentSchema,
  })
  content: {
    text: string;
  };
}
```

#### 6. Structured Output Documents

Define complex document schemas for structured AI output:

```typescript
export const OptimizedMeetingNotesDocumentSchema = z.object({
  date: z.string(),
  summary: z.string(),
  participants: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(z.string()),
});
```

Configure the document UI with ordering, collapsible arrays, and confirm button:

```yaml
# optimized-notes-document.yaml
type: document
ui:
  form:
    order:
      - date
      - summary
      - participants
      - decisions
      - actionItems
    properties:
      date:
        title: Date
      summary:
        title: Summary
        widget: textarea
      participants:
        title: Participants
        collapsed: true
        items:
          title: Participant
      actionItems:
        title: Action Items
        collapsed: true
        items:
          title: Action Item
  actions:
    - type: button
      widget: button
      transition: confirm
      options:
        label: 'Confirm'
```

#### 7. AI Document Generation

Use `aiGenerateDocument` to populate a structured document. Reference state values with `state.<name>`:

```yaml
- id: optimize_notes
  from: response_received
  to: notes_optimized
  call:
    - id: prompt
      tool: aiGenerateDocument
      args:
        llm:
          provider: openai
          model: gpt-4o
        response:
          id: final
          document: optimizedNotesDocument
        prompt: |
          Extract all information from the provided meeting notes into the structured document.

          <Meeting Notes>
          {{ state.meetingNotes.text }}
          </Meeting Notes>
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/core-ui-module` - Provides `CreateDocument` tool
- `@loopstack/ai-module` - Provides `AiGenerateDocument` tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
