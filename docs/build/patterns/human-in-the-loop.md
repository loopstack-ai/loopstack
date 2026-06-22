---
title: Human-in-the-Loop
description: Pausing workflows for user input, review, or confirmation. Covers wait:true transitions on custom documents, AskUserWorkflow / ConfirmUserWorkflow sub-workflow shortcuts, and LLM-agent HITL via the ask_clarification and ask_for_approval tools.
---

# Human-in-the-Loop

Pause workflows for user input, review, or confirmation. Loopstack offers three distinct patterns — pick the one that matches who decides what to ask.

## Choosing a HITL Pattern

| You are building...                                                                     | Use                                                                                | Where it lives                                                            |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A predefined workflow with known user-input steps — form fields, structured records     | **Custom document with a widget** — your workflow owns the document + `wait: true` | This page → [Wait Transition Pattern](#wait-transition-pattern)           |
| A predefined workflow that just needs a quick generic ask (free text, yes/no, pick one) | **`AskUserWorkflow` / `ConfirmUserWorkflow`** as a sub-workflow shortcut           | This page → [Using HITL as a Sub-Workflow](#using-hitl-as-a-sub-workflow) |
| An LLM agent loop where the agent dynamically decides when to ask                       | **Agent tools** `ask_clarification` / `ask_for_approval`                           | This page → [Agent-Driven HITL](#agent-driven-hitl)                       |

The custom-document pattern is the **default for predefined workflows**: the form _is_ the structured data, the wait-transition payload schema _is_ the document schema, and types line up end-to-end. Sub-workflow shortcuts are for when designing a form would be overkill. Agent tools are for LLM-driven flows where the next question isn't known in advance.

## Wait Transition Pattern

A transition with `wait: true` pauses the workflow until externally triggered by user interaction:

```typescript
import type { TransitionInput } from '@loopstack/common';

@Transition({
  from: 'waiting_for_user',
  to: 'ready',
  wait: true,
  schema: z.object({ message: z.string() }),
})
async userMessage(state: Record<string, unknown>, input: TransitionInput<{ message: string }>): Promise<Record<string, unknown>> {
  await this.documentStore.save(LlmMessageDocument, {
    role: 'user',
    text: input.data.message,
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
async userMessage(state: Record<string, unknown>, input: TransitionInput<string>): Promise<Record<string, unknown>> {
  await this.documentStore.save(LlmMessageDocument, {
    role: 'user',
    text: input.data,
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
import type { RunContext } from '@loopstack/common';
import { LlmGenerateObjectTool } from '@loopstack/llm-provider-module';

interface MeetingNotesState {
  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
}

const MeetingNotesArgsSchema = z.object({ inputText: z.string().default('...') });
type MeetingNotesArgs = z.infer<typeof MeetingNotesArgsSchema>;

@Workflow({
  widget: __dirname + '/meeting-notes.ui.yaml',
  schema: MeetingNotesArgsSchema,
})
export class MeetingNotesWorkflow extends BaseWorkflow<MeetingNotesArgs> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }

  @Transition({ to: 'waiting_for_response' })
  async createForm(state: MeetingNotesState, ctx: RunContext<MeetingNotesArgs>): Promise<MeetingNotesState> {
    await this.documentStore.save(MeetingNotesDocument, { text: ctx.args.inputText }, { id: 'input' });
    return state;
  }

  // Wait for user to edit and submit
  @Transition({ from: 'waiting_for_response', to: 'response_received', wait: true, schema: MeetingNotesDocumentSchema })
  async userResponse(
    state: MeetingNotesState,
    input: TransitionInput<z.infer<typeof MeetingNotesDocumentSchema>>,
  ): Promise<MeetingNotesState> {
    const result = await this.documentStore.save(MeetingNotesDocument, input.data, { id: 'input' });
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
    input: TransitionInput<z.infer<typeof OptimizedMeetingNotesDocumentSchema>>,
  ): Promise<unknown> {
    await this.documentStore.save(OptimizedNotesDocument, input.data, { id: 'final' });
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

## Using HITL as a Sub-Workflow

The `wait: true` pattern above is for workflows that own their own UI. For generic prompts you don't want to design a form for, run `AskUserWorkflow` or `ConfirmUserWorkflow` from `@loopstack/hitl` as a sub-workflow and receive the answer through a callback.

The callback delivers the standard `TransitionInput<TData>` envelope — the `schema` on the transition describes only `data`, and `input.data` is fully typed. See [Sub-Workflows → Typing the Callback Envelope](./sub-workflows.md#typing-the-callback-envelope) for the full reference.

### `AskUserWorkflow` — free text

```typescript
import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AnswerSchema = z.object({ answer: z.string() });

@Workflow({ title: 'Ask Then Continue' })
export class AskThenContinueWorkflow extends BaseWorkflow {
  constructor(private readonly askUser: AskUserWorkflow) {
    super();
  }

  @Transition({ to: 'waiting' })
  async ask(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.askUser.run({ question: 'What is your name?' }, { callback: { transition: 'onAnswer' } });
    return state;
  }

  @Transition({ from: 'waiting', to: 'end', wait: true, schema: AnswerSchema })
  async onAnswer(state: Record<string, unknown>, input: TransitionInput<{ answer: string }>): Promise<unknown> {
    return { name: input.data.answer };
  }
}
```

### `AskUserWorkflow` — pick from options

Pass `mode: 'options'` with a list of choices. `allowCustomAnswer: true` adds a free-text field alongside the choices for "other".

```typescript
await this.askUser.run(
  {
    question: 'Which environment should we deploy to?',
    mode: 'options',
    options: ['staging', 'production'],
    allowCustomAnswer: true,
  },
  { callback: { transition: 'choiceReceived' } },
);
```

The envelope shape is the same as the free-text case (`input.data: { answer: string }`).

### `AskUserWorkflow` — yes / no

Pass `mode: 'confirm'`. The answer comes back as the literal string `'yes'` or `'no'` in `input.data.answer` — compare directly.

```typescript
await this.askUser.run(
  { question: 'Send the email now?', mode: 'confirm' },
  { callback: { transition: 'decisionReceived' } },
);
```

### `ConfirmUserWorkflow` — markdown review

For showing a pre-rendered markdown blob (a release plan, a summary, a code diff) and receiving an explicit approve/deny, use `ConfirmUserWorkflow`. The callback `input.data` carries both the user's decision and the original markdown:

```typescript
import { ConfirmUserWorkflow } from '@loopstack/hitl';

const ConfirmSchema = z.object({ confirmed: z.boolean(), markdown: z.string() });

@Transition({ to: 'awaiting' })
async showSummary(state: Record<string, unknown>): Promise<Record<string, unknown>> {
  await this.confirmUser.run(
    { markdown: '## Ready to deploy v1.2.3?\n\n- 3 commits since last release\n- Smoke tests passing' },
    { callback: { transition: 'decisionReceived' } },
  );
  return state;
}

@Transition({ from: 'awaiting', to: 'end', wait: true, schema: ConfirmSchema })
async decisionReceived(
  state: Record<string, unknown>,
  input: TransitionInput<z.infer<typeof ConfirmSchema>>,
): Promise<unknown> {
  return { confirmed: input.data.confirmed };
}
```

## Agent-Driven HITL

When the asking party is an LLM agent rather than your workflow, use the `ask_clarification` and `ask_for_approval` tools from `@loopstack/hitl`. The agent decides at runtime to call the tool; the agent loop pauses, the user answers, and the answer flows back as the tool result — no extra wait-transition wiring at your level.

### `ask_clarification` — agent asks the user a question

Register the tool in your module and add it to the agent's tool list. A system prompt that tells the agent to use the tool when info is missing is enough:

```typescript
import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';

const AgentResponseSchema = z.object({ response: z.string() });

const SYSTEM_PROMPT = `You are a trip-planning assistant.
- Before recommending a destination, you MUST know BOTH the user's budget AND climate preference.
- If either is missing, your response MUST be exactly ONE tool call to "ask_clarification".`;

@Workflow({ title: 'Trip Planner' })
export class TripPlannerWorkflow extends BaseWorkflow {
  constructor(private readonly agent: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.agent.run(
      {
        system: SYSTEM_PROMPT,
        tools: ['ask_clarification'],
        userMessage: 'Where should I go on holiday next month?',
      },
      { callback: { transition: 'onComplete' } },
    );
    return state;
  }

  @Transition({ from: 'running', to: 'end', wait: true, schema: AgentResponseSchema })
  async onComplete(state: Record<string, unknown>, input: TransitionInput<{ response: string }>): Promise<unknown> {
    await this.documentStore.save(MessageDocument, { role: 'assistant', text: input.data.response });
    return { response: input.data.response };
  }
}
```

`ask_clarification` supports the same `mode` arg as `AskUserWorkflow` (`'text'` / `'options'` / `'confirm'`) — the LLM can pick the right mode per call.

### `ask_for_approval` — agent asks the user to approve content

Same shape, with `tools: ['ask_for_approval']`. The agent drafts content and passes it as the `concept` argument; the user sees the markdown and confirms or denies. The agent loop only resumes after the decision.

```typescript
const SYSTEM_PROMPT = `You are a release-notes drafting assistant.
- Your response MUST be exactly ONE tool call to "ask_for_approval".
- The "concept" argument IS the markdown draft.`;

await this.agent.run(
  {
    system: SYSTEM_PROMPT,
    tools: ['ask_for_approval'],
    userMessage: 'Draft release notes for v1.2.3.',
  },
  { callback: { transition: 'onComplete' } },
);
```

See [`@loopstack/hitl`](https://loopstack.ai/registry/loopstack-hitl-module) for the full tool args reference.

## Registry References

- [hitl-example-module](https://loopstack.ai/registry/loopstack-hitl-example-module) — Side-by-side examples of every HITL pattern: custom document with widget, all `AskUserWorkflow` modes, `ConfirmUserWorkflow`, and both agent tools
- [@loopstack/hitl](https://loopstack.ai/registry/loopstack-hitl-module) — The underlying HITL module: `AskUserWorkflow`, `ConfirmUserWorkflow`, `ask_clarification`, `ask_for_approval`
- [meeting-notes-example-workflow](https://loopstack.ai/registry/loopstack-meeting-notes-example-workflow) — Full human-in-the-loop workflow with editable form, AI optimization, and user confirmation
- [chat-example-workflow](https://loopstack.ai/registry/loopstack-chat-example-workflow) — Chat input pattern with prompt-input widget
