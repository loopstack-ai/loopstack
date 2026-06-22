---
title: 'Tutorial: Human-in-the-Loop Approval Workflow'
description: Step-by-step tutorial building a workflow that takes meeting notes, shows them for review, sends them to an LLM for structured extraction, and waits for human confirmation.
---

# Tutorial: Build a Human-in-the-Loop Approval Workflow

In this tutorial you'll build a workflow that takes raw meeting notes, shows them for review, sends them to an LLM to extract structured data, then waits for a human to confirm the result before completing.

When you're done you'll have a working workflow in Loopstack Studio that looks like this:

```
start → show raw notes → [user clicks "Optimize"] → LLM structures the notes → [user clicks "Confirm"] → end
```

**What you'll learn:**

- How to define custom document types with Zod schemas and YAML widget configs
- How `wait: true` transitions pause the workflow until a user clicks a button
- How to use `LlmGenerateObjectTool` to force the LLM to return structured data
- How Handlebars templates keep prompts clean and maintainable
- How state flows through a multi-step workflow with two human checkpoints

**Prerequisites:** Complete the [Getting Started](../build/getting-started.md) guide first. You should have a running NestJS app with `LoopstackModule.forRoot()` configured and Studio accessible at `http://localhost:5173`.

**Time:** ~30 minutes

---

## 1. Install Dependencies

This workflow uses the Claude LLM provider for structured output:

```shell
npm install @loopstack/claude-module @loopstack/llm-provider-module
```

---

## 2. Create the Module

Create the folder and module file. The module wires everything together — you'll add the workflow and documents to it as you build them.

Create `src/meeting-notes/meeting-notes.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { StudioApp } from '@loopstack/common';
import { MeetingNotesWorkflow } from './meeting-notes.workflow';

@StudioApp({
  title: 'Meeting Notes',
  workflows: [MeetingNotesWorkflow],
})
@Module({
  imports: [ClaudeModule],
  providers: [MeetingNotesWorkflow],
  exports: [MeetingNotesWorkflow],
})
export class MeetingNotesModule {}
```

Register it in `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { MeetingNotesModule } from './meeting-notes/meeting-notes.module';

@Module({
  imports: [LoopstackModule.forRoot(), MeetingNotesModule],
})
export class AppModule {}
```

---

## 3. Create the Input Document

The first thing the workflow shows is the raw notes — editable by the user before processing. You need a document for this.

A document in Loopstack has two parts: a **TypeScript class** with a Zod schema (for validation) and a **YAML file** (for how it renders in Studio).

Create `src/meeting-notes/documents/meeting-notes-document.ts`:

```typescript
import { z } from 'zod';
import { Document } from '@loopstack/common';

export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@Document({
  schema: MeetingNotesDocumentSchema,
  widget: __dirname + '/meeting-notes-document.yaml',
})
export class MeetingNotesDocument {
  text: string;
}
```

Create `src/meeting-notes/documents/meeting-notes-document.yaml`:

```yaml
widget: form
options:
  properties:
    text:
      title: Notes
      widget: textarea
  actions:
    - type: button
      transition: userResponse
      label: 'Optimize Notes'
```

**Why the button is here:** The `transition: userResponse` value links the button directly to a `wait: true` method in the workflow (you'll create that next). When the user clicks **Optimize Notes**, Studio sends the current form content as the transition payload and the workflow resumes. The method name must match exactly.

---

## 4. Create the Output Document

After the LLM processes the notes, you need a second document to display the structured result — with its own fields and a **Confirm** button.

Create `src/meeting-notes/documents/optimized-notes-document.ts`:

```typescript
import { z } from 'zod';
import { Document } from '@loopstack/common';

export const OptimizedMeetingNotesDocumentSchema = z.object({
  date: z.string(),
  summary: z.string(),
  participants: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(z.string()),
});

@Document({
  schema: OptimizedMeetingNotesDocumentSchema,
  widget: __dirname + '/optimized-notes-document.yaml',
})
export class OptimizedNotesDocument {
  date: string;
  summary: string;
  participants: string[];
  decisions: string[];
  actionItems: string[];
}
```

Create `src/meeting-notes/documents/optimized-notes-document.yaml`:

```yaml
widget: form
options:
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
    decisions:
      title: Decisions
      collapsed: true
      items:
        title: Decision
    actionItems:
      title: Action Items
      collapsed: true
      items:
        title: Action Item
  actions:
    - type: button
      transition: confirm
      label: 'Confirm'
```

**Why collapsed arrays:** The `collapsed: true` option hides the list items until expanded. Meeting notes can have many participants and action items — collapsing them by default keeps the form readable.

---

## 5. Create the Prompt Template

Rather than embedding the prompt string directly in the workflow code, use a Handlebars template file. This keeps long prompts readable and makes them easy to iterate on without touching TypeScript.

Create `src/meeting-notes/templates/extract-notes.md`:

```markdown
Extract all information from the provided meeting notes into the structured document.

<Meeting Notes>
{{text}}
</Meeting Notes>
```

The `{{text}}` placeholder is replaced at runtime with the notes the user submitted.

---

## 6. Write the Workflow

Now all the pieces are ready. The workflow ties them together as a state machine.

Create `src/meeting-notes/meeting-notes.workflow.ts`:

```typescript
import { z } from 'zod';
import { toJSONSchema } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import type { LlmGenerateObjectResult } from '@loopstack/llm-provider-module';
import { LlmGenerateObjectTool } from '@loopstack/llm-provider-module';
import { MeetingNotesDocument, MeetingNotesDocumentSchema } from './documents/meeting-notes-document';
import { OptimizedMeetingNotesDocumentSchema, OptimizedNotesDocument } from './documents/optimized-notes-document';

interface MeetingNotesState {
  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
}

const MeetingNotesArgsSchema = z.object({
  inputText: z
    .string()
    .default(
      '- meeting 1.1.2025\n- budget: need 2 cut costs sarah said\n- hire new person?? --> marketing\n- vendor pricing - follow up needed by anna',
    ),
});
type MeetingNotesArgs = z.infer<typeof MeetingNotesArgsSchema>;

@Workflow({
  title: 'Meeting Notes Optimizer',
  description: 'Structures raw meeting notes using AI, with human review at each step.',
  schema: MeetingNotesArgsSchema,
})
export class MeetingNotesWorkflow extends BaseWorkflow<MeetingNotesArgs> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }

  // Step 1: Display raw notes as an editable form and wait
  @Transition({ to: 'waiting_for_response' })
  async showNotes(state: MeetingNotesState, ctx: RunContext<MeetingNotesArgs>) {
    await this.documentStore.save(MeetingNotesDocument, { text: ctx.args.inputText }, { id: 'input' });
  }

  // Step 2: User clicks "Optimize Notes" — input.data is the edited form content
  @Transition({ from: 'waiting_for_response', to: 'response_received', wait: true, schema: MeetingNotesDocumentSchema })
  async userResponse(state: MeetingNotesState, input: TransitionInput<z.infer<typeof MeetingNotesDocumentSchema>>) {
    // Persist whatever the user may have edited before clicking the button
    const result = await this.documentStore.save(MeetingNotesDocument, input.data, { id: 'input' });
    this.assignState({ meetingNotes: result.content as z.infer<typeof MeetingNotesDocumentSchema> });
  }

  // Step 3: Send notes to LLM, save the structured result
  @Transition({ from: 'response_received', to: 'notes_optimized' })
  async optimizeNotes(state: MeetingNotesState) {
    const result = await this.llmGenerateObject.call(
      {
        // Convert the Zod schema to JSON Schema — the LLM uses this to constrain its output
        outputSchema: toJSONSchema(OptimizedMeetingNotesDocumentSchema) as Record<string, unknown>,
        prompt: this.render(__dirname + '/templates/extract-notes.md', { text: state.meetingNotes?.text }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    const objectResult = result.data as LlmGenerateObjectResult;
    await this.documentStore.save(
      OptimizedNotesDocument,
      objectResult.data as z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
      { id: 'final', validate: 'skip' },
    );
  }

  // Step 4: User reviews the structured output and clicks "Confirm"
  @Transition({ from: 'notes_optimized', to: 'end', wait: true, schema: OptimizedMeetingNotesDocumentSchema })
  async confirm(state: MeetingNotesState, input: TransitionInput<z.infer<typeof OptimizedMeetingNotesDocumentSchema>>) {
    // Save final confirmed version and publish it as the workflow output
    const result = await this.documentStore.save(OptimizedNotesDocument, input.data, { id: 'final' });
    this.setResult({ optimizedNotes: result.content });
  }
}
```

**Why `validate: 'skip'` when saving the LLM result:** LLM output can occasionally deviate from the schema in minor ways (empty strings, null values). Using `validate: 'skip'` saves it anyway so the user can review and correct it in the form before confirming.

**Why the final transition calls `this.setResult(...)`:** The published `result` becomes the workflow's output. If this workflow is later used as a sub-workflow, the parent receives `input.data.optimizedNotes` in its callback envelope.

---

## 7. Add Documents to the Module

Documents are registered as providers so NestJS can resolve their `@Document` metadata. Update the module to include them:

```typescript
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { StudioApp } from '@loopstack/common';
import { MeetingNotesDocument } from './documents/meeting-notes-document';
import { OptimizedNotesDocument } from './documents/optimized-notes-document';
import { MeetingNotesWorkflow } from './meeting-notes.workflow';

@StudioApp({
  title: 'Meeting Notes',
  workflows: [MeetingNotesWorkflow],
})
@Module({
  imports: [ClaudeModule],
  providers: [MeetingNotesWorkflow, MeetingNotesDocument, OptimizedNotesDocument],
  exports: [MeetingNotesWorkflow],
})
export class MeetingNotesModule {}
```

---

## 8. Add Your API Key and Run

Add your Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Start (or restart) the dev server:

```shell
npm run start:dev
```

---

## 9. Try It in Studio

Open Studio at `http://localhost:5173`.

1. Click **New Run** and select the **Meeting Notes** app
2. Select the **Meeting Notes Optimizer** workflow
3. The input field is pre-filled with sample notes — click **Run Now**
4. The workflow shows the raw notes as an editable textarea. Edit them if you want, then click **Optimize Notes**
5. The workflow calls the LLM. After a moment the structured output appears — date, summary, participants, decisions, and action items extracted from your notes
6. Review the structured data, edit any field, then click **Confirm**
7. The workflow completes. The final structured notes are saved as the workflow output

---

## What Just Happened

Let's trace the state flow:

```
start
  → showNotes        saves raw notes, moves to waiting_for_response
  → [PAUSE]          workflow waits — user reads and optionally edits
  → userResponse     user clicks "Optimize Notes", input.data = form content
  → optimizeNotes    calls LLM with structured output schema, saves result
  → [PAUSE]          workflow waits — user reviews AI output
  → confirm          user clicks "Confirm", input.data = confirmed content
  → end              workflow completes, output = confirmed notes
```

Each `wait: true` transition is a checkpoint. The workflow can pause here for seconds or days — it survives restarts, deployments, and anything else that happens in between. When the user eventually clicks the button, it resumes exactly from that point.

---

## Next Steps

- **[Sub-Workflows](../build/patterns/sub-workflows.md)** — Use this workflow as a step inside a larger workflow
- **[Dynamic Routing](../build/patterns/dynamic-routing.md)** — Add a guard to route differently if the LLM output confidence is low
- **[Error Handling](../build/patterns/error-handling.md)** — Add retry logic to the `optimizeNotes` transition in case the LLM call fails
- **[Registry example](https://loopstack.ai/registry/loopstack-meeting-notes-example-workflow)** — The complete source for this workflow
