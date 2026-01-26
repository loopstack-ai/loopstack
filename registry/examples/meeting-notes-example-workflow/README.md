# @loopstack/meeting-notes-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to build human-in-the-loop AI workflows with manual triggers and interactive documents.

## Overview

The Meeting Notes Example Workflow shows how to create workflows that pause for user input and allow users to review and edit AI-generated content. It takes unstructured meeting notes and uses AI to extract structured information like date, participants, decisions, and action items.

By using this workflow as a reference, you'll learn how to:

- Use manual triggers to pause workflows for user input
- Create interactive documents with action buttons
- Handle transition payloads from user interactions
- Transform unstructured text into structured data with AI
- Build review-and-confirm patterns for AI outputs

This example is essential for developers building workflows that require human oversight or approval steps.

## Installation

### Prerequisites

Create a new Loopstack project if you haven't already:

```bash
npx create-loopstack-app my-project
cd my-project
```

Start Environment

```bash
cd my-project
docker compose up -d
```

### Add the Module

```bash
loopstack add @loopstack/meeting-notes-example-workflow
```

This copies the source files into your `src` directory.

> Using the `loopstack add` command is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `MeetingNotesExampleModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { MeetingNotesExampleModule } from './@loopstack/meeting-notes-example-workflow';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule, MeetingNotesExampleModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Register in Your Workspace

Add the workflow to your workspace class using the `@Workflow()` decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { BlockConfig, Workflow } from '@loopstack/common';
import { WorkspaceBase } from '@loopstack/core';
import { MeetingNotesWorkflow } from './@loopstack/meeting-notes-example-workflow';

@Injectable()
@BlockConfig({
  config: {
    title: 'My Workspace',
    description: 'A workspace with the meeting notes example workflow',
  },
})
export class MyWorkspace extends WorkspaceBase {
  @Workflow() meetingNotesWorkflow: MeetingNotesWorkflow;
}
```

### 3. Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```

## How It Works

### Workflow Flow

1. **Start** - User provides unstructured meeting notes
2. **Wait for Input** - User can edit the notes, then clicks "Optimize Notes"
3. **AI Processing** - LLM extracts structured information into a formatted document
4. **Review** - User reviews and can edit the structured output
5. **Confirm** - User clicks "Confirm" to finalize

### Key Concepts

#### 1. Manual Triggers

Use `trigger: manual` to pause the workflow and wait for user interaction:

```yaml
- id: user_response
  from: waiting_for_response
  to: response_received
  trigger: manual
```

The workflow pauses at `waiting_for_response` until the user triggers the transition.

#### 2. Document Actions with Buttons

Add action buttons to documents that trigger transitions:

```yaml
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

#### 3. Transition Payloads

Access user input from the transition payload:

```yaml
- id: user_response
  trigger: manual
  call:
    - tool: createDocument
      args:
        update:
          content: ${ transition.payload }
      assign:
        meetingNotes: ${ result.data.content }
```

The `transition.payload` contains the document content when the user clicked the button.

#### 4. Structured Output Documents

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

#### 5. Array Fields with Collapsible UI

Configure array fields with custom item titles and collapsed display:

```yaml
ui:
  form:
    properties:
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
```

#### 6. AI Document Generation

Use `aiGenerateDocument` to populate a structured document:

```yaml
- tool: aiGenerateDocument
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
      {{ meetingNotes.text }}
      </Meeting Notes>
  assign:
    optimizedNotes: ${ result.data.content }
```

The LLM automatically fills in the document fields based on the schema.

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
