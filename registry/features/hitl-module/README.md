---
title: Human-in-the-Loop Module
description: HITL workflows and tools for Loopstack — AskUserWorkflow (free-text, confirm, multiple-choice), ConfirmUserWorkflow (markdown review + confirm/deny), AskClarificationTool, AskForApprovalTool, document types for UI rendering
---

# @loopstack/hitl

> Human-in-the-loop module for the [Loopstack](https://loopstack.ai) automation framework.

Pause a running workflow or agent loop, ask the user a question or request confirmation, and resume once they answer. Ships with ready-to-use workflows, agent tools, and document types that render prompts in the Studio UI.

## When to Use

- **Your workflow needs user input** before it can continue — a name, a choice, a yes/no decision. Use `AskUserWorkflow` as a sub-workflow.
- **Your workflow needs explicit approval** of generated content (e.g. a plan, a summary, a code diff). Use `ConfirmUserWorkflow`.
- **Your LLM agent needs to ask the user a question** mid-loop without exiting. Use `AskClarificationTool` — it pauses the agent, collects the answer, and resumes.
- **Your LLM agent needs user approval** before proceeding. Use `AskForApprovalTool` — it shows markdown content and waits for confirm/deny.

## Installation

```bash
npm install @loopstack/hitl
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { HitlModule } from '@loopstack/hitl';

@Module({
  imports: [HitlModule],
  providers: [MyWorkflow],
})
export class MyModule {}
```

## Quick Start

### Sub-workflow: Ask a question

```typescript
import { z } from 'zod';
import { BaseWorkflow, CallbackSchema, LinkDocument, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AnswerCallback = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});

@Workflow({ title: 'My Workflow' })
export class MyWorkflow extends BaseWorkflow {
  constructor(private readonly askUser: AskUserWorkflow) {
    super();
  }

  @Transition({ to: 'waiting' })
  async start(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.askUser.run(
      { question: 'What is your name?' },
      { callback: { transition: 'answerReceived' } },
    );
    await this.documentStore.save(
      LinkDocument,
      { label: 'Waiting for answer...', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Transition({ from: 'waiting', to: 'end', wait: true, schema: AnswerCallback })
  async answerReceived(state: Record<string, unknown>, payload: z.infer<typeof AnswerCallback>): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Hello, ${payload.data.answer}!`,
    });
    return {};
  }
}
```

### Agent tool: Ask for clarification

Register the tool in your module so an LLM agent can call it mid-loop:

```typescript
import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { HitlModule } from '@loopstack/hitl';
import { AskClarificationTool } from '@loopstack/hitl';

@Module({
  imports: [AgentModule, HitlModule],
  providers: [MyWorkflow, AskClarificationTool],
})
export class MyModule {}
```

Then include it in the agent's tool list:

```typescript
await this.agent.run({
  system: 'You are a helpful assistant. Ask the user for clarification when needed.',
  tools: ['search', 'ask_clarification'],
  userMessage: 'Help me plan my project.',
});
```

## How It Works

### AskUserWorkflow

A sub-workflow with three modes, selected via the `mode` arg:

```
start → show_question → waiting_for_user → end
```

The `show_question` state uses guard-based routing to save the correct document type:

- **text** (default) — saves `AskUserDocument`, renders a free-text input
- **options** — saves `AskUserOptionsDocument`, renders a choice list
- **confirm** — saves `AskUserConfirmDocument`, renders yes/no buttons

**Returns:** `{ answer: string }`

#### Multiple-choice and confirmation modes

```typescript
// Multiple choice
await this.askUser.run(
  {
    question: 'Which environment?',
    mode: 'options',
    options: ['staging', 'production'],
    allowCustomAnswer: false,
  },
  { callback: { transition: 'envSelected' } },
);

// Yes/No confirmation
await this.askUser.run(
  {
    question: 'Proceed with deletion?',
    mode: 'confirm',
  },
  { callback: { transition: 'confirmed' } },
);
```

### ConfirmUserWorkflow

Shows markdown content and waits for a confirm or deny response:

```
start → waiting_for_confirmation → end
```

Two wait transitions (`userConfirmed` / `userDenied`) resolve to different results.

**Returns:** `{ confirmed: boolean, markdown: string }`

```typescript
import { ConfirmUserWorkflow } from '@loopstack/hitl';

const result = await this.confirmUser.run(
  { markdown: '## About to commit\n\n- 3 files changed' },
  { callback: { transition: 'decisionReceived' } },
);
```

### Agent Tools

Both tools follow the same pattern: launch the corresponding sub-workflow, return a `pending` result, and complete when the user responds. The agent loop pauses automatically while waiting.

## Args Reference

### AskUserWorkflow

| Arg                 | Type                               | Required | Description                            |
| ------------------- | ---------------------------------- | -------- | -------------------------------------- |
| `question`          | `string`                           | yes      | The question to display                |
| `mode`              | `'text' \| 'options' \| 'confirm'` | no       | Presentation mode (default: `'text'`)  |
| `options`           | `string[]`                         | no       | Choices when mode is `'options'`       |
| `allowCustomAnswer` | `boolean`                          | no       | Show free-text input alongside options |

**Returns:** `{ answer: string }`

### ConfirmUserWorkflow

| Arg        | Type     | Required | Description                         |
| ---------- | -------- | -------- | ----------------------------------- |
| `markdown` | `string` | yes      | Markdown content to show for review |

**Returns:** `{ confirmed: boolean, markdown: string }`

## Tools Reference

### `ask_clarification`

Ask the user a clarification question mid-agent-loop. Pauses the agent, waits for user input, resumes with the answer.

| Arg                 | Type                               | Required | Description                       |
| ------------------- | ---------------------------------- | -------- | --------------------------------- |
| `question`          | `string`                           | yes      | The clarification question        |
| `mode`              | `'text' \| 'options' \| 'confirm'` | no       | Presentation mode                 |
| `options`           | `string[]`                         | no       | Choices when mode is `'options'`  |
| `allowCustomAnswer` | `boolean`                          | no       | Allow free-text alongside options |

**Returns:** the user's answer as a string

### `ask_for_approval`

Present markdown content to the user for approval. Pauses the agent until the user confirms or denies.

| Arg       | Type     | Required | Description                              |
| --------- | -------- | -------- | ---------------------------------------- |
| `concept` | `string` | yes      | Markdown content to present for approval |

**Returns:** `{ concept: string }` if approved, `{ denied: true }` if denied

## Public API

- **Module:** `HitlModule`
- **Workflows:** `AskUserWorkflow`, `ConfirmUserWorkflow`
- **Tools:** `AskClarificationTool`, `AskForApprovalTool`
- **Documents:** `AskUserDocument`, `AskUserConfirmDocument`, `AskUserOptionsDocument`, `ConfirmUserDocument`

## Dependencies

- `@loopstack/common` — `BaseWorkflow`, `BaseTool`, decorators, `LinkDocument`
- `@loopstack/core` — `LoopCoreModule`

## Related

- [Human-in-the-Loop Patterns](https://loopstack.ai/docs/build/patterns/human-in-the-loop) — wait transitions, document actions, conditional widgets
- [hitl-ask-user-example-workflow](https://loopstack.ai/registry/loopstack-hitl-ask-user-example-workflow) — AskUserWorkflow example with callback
- [hitl-confirm-example-workflow](https://loopstack.ai/registry/loopstack-hitl-confirm-example-workflow) — ConfirmUserWorkflow example with confirm/deny

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
