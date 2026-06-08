---
title: Human-in-the-Loop
description: Pausing workflows for user input, review, or confirmation using wait:true transitions, document UI actions, payload schemas, and approval patterns.
---

# Human-in-the-Loop

Pause workflows for user input, review, or confirmation using `wait: true` transitions and document UI actions.

## Wait Transition Pattern

A transition with `wait: true` pauses the workflow until externally triggered by user interaction:

```typescript
@Transition({
  from: 'waiting_for_user',
  to: 'ready',
  wait: true,
  schema: z.object({ message: z.string() }),
})
async userMessage(state: Record<string, unknown>, payload: { message: string }): Promise<Record<string, unknown>> {
  await this.documentStore.save(LlmMessageDocument, {
    role: 'user',
    content: payload.message,
  });
  return state;
}
```

## Document Action Buttons

Documents can include buttons that trigger `wait: true` transitions:

```yaml
# Document YAML
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
            transition: userResponse # Must match the method name
            label: 'Submit'
```

When the user clicks **Submit**, the workflow's `userResponse` method fires with the document's current content as the payload.

## Chat Input Widget

For conversational UIs, use the `prompt-input` widget:

```yaml
ui:
  widgets:
    - widget: prompt-input
      enabledWhen:
        - waiting_for_user
      options:
        transition: userMessage
```

```typescript
@Transition({
  from: 'waiting_for_user',
  to: 'ready',
  wait: true,
  schema: z.string(),
})
async userMessage(state: Record<string, unknown>, payload: string): Promise<Record<string, unknown>> {
  await this.documentStore.save(LlmMessageDocument, {
    role: 'user',
    content: payload,
  });
  return state;
}
```

## Confirmation Pattern

Show AI-generated content for user review before proceeding:

```typescript
import { z } from 'zod';
import { toJSONSchema } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { LlmGenerateObjectTool } from '@loopstack/llm-provider-module';

interface MeetingNotesState {
  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
}

@Workflow({
  widget: __dirname + '/meeting-notes.ui.yaml',
  schema: z.object({ inputText: z.string().default('...') }),
})
export class MeetingNotesWorkflow extends BaseWorkflow<{ inputText: string }, MeetingNotesState> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }

  @Transition({ to: 'waiting_for_response' })
  async createForm(state: MeetingNotesState, ctx: LoopstackContext): Promise<MeetingNotesState> {
    const args = ctx.args as { inputText: string };
    await this.documentStore.save(MeetingNotesDocument, { text: args.inputText }, { id: 'input' });
    return state;
  }

  // Wait for user to edit and submit
  @Transition({ from: 'waiting_for_response', to: 'response_received', wait: true, schema: MeetingNotesDocumentSchema })
  async userResponse(
    state: MeetingNotesState,
    payload: z.infer<typeof MeetingNotesDocumentSchema>,
  ): Promise<MeetingNotesState> {
    const result = await this.documentStore.save(MeetingNotesDocument, payload, { id: 'input' });
    return { ...state, meetingNotes: result.content as z.infer<typeof MeetingNotesDocumentSchema> };
  }

  // AI generates structured output
  @Transition({ from: 'response_received', to: 'notes_optimized' })
  async optimizeNotes(state: MeetingNotesState): Promise<MeetingNotesState> {
    const result = await this.llmGenerateObject.call(
      {
        outputSchema: toJSONSchema(OptimizedMeetingNotesDocumentSchema) as Record<string, unknown>,
        prompt: `Structure these notes: ${state.meetingNotes?.text}`,
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    const objectResult = result.data as LlmGenerateObjectResult;
    await this.documentStore.save(
      OptimizedNotesDocument,
      objectResult.data as z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
      { id: 'final', validate: 'skip' },
    );
    return state;
  }

  // Wait for user to confirm
  @Transition({ from: 'notes_optimized', to: 'end', wait: true, schema: OptimizedMeetingNotesDocumentSchema })
  async confirm(
    state: MeetingNotesState,
    payload: z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
  ): Promise<unknown> {
    await this.documentStore.save(OptimizedNotesDocument, payload, { id: 'final' });
    return {};
  }
}
```

## `enabledWhen` — Conditional Widgets

Show/hide widgets based on the current workflow place:

```yaml
ui:
  widgets:
    - widget: form
      enabledWhen:
        - review
        - editing
      options:
        properties:
          summary:
            title: Summary
            widget: textarea
        actions:
          - type: button
            transition: confirm
            label: 'Confirm'
```

The widget only appears when the workflow is at the `review` or `editing` place.

## Registry References

- [meeting-notes-example-workflow](https://loopstack.ai/registry/loopstack-meeting-notes-example-workflow) — Full human-in-the-loop workflow with editable form, AI optimization, and user confirmation
- [chat-example-workflow](https://loopstack.ai/registry/loopstack-chat-example-workflow) — Chat input pattern with prompt-input widget
