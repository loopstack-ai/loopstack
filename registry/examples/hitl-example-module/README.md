---
title: HITL Examples Module
description: Comprehensive examples of Human-in-the-Loop patterns in Loopstack — custom Document with a form widget, AskUserWorkflow / ConfirmUserWorkflow sub-workflow shortcuts, and LLM agent loops with the ask_clarification / ask_for_approval tools. Demonstrates when to design a form vs delegate to a generic prompt vs let an agent decide to ask.
---

# @loopstack/hitl-example-module

Side-by-side examples of every way to pause a Loopstack workflow for the user.

The point of this package is to answer one question: **when do I design a custom document with a widget, vs. when do I delegate to a HITL sub-workflow, vs. when do I let an LLM agent ask the user?**

## Decision matrix

| You are building...                                                                                                                     | Use                                                                                                 | Workflow in this package                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A predefined workflow with known user-input steps — form fields, structured data, a record the user edits                               | **Custom document with a widget** — your workflow owns the document and the `wait: true` transition | [`InlineFormWorkflow`](./src/inline-form/inline-form.workflow.ts), [`PromptInputChatWorkflow`](./src/prompt-input-chat/prompt-input-chat.workflow.ts)                                                                                                                                                                   |
| An LLM agent loop where the LLM dynamically decides to ask the user something or request approval                                       | **Agent tools** `ask_clarification` / `ask_for_approval` from `@loopstack/hitl`                     | [`AgentAskClarificationWorkflow`](./src/agent-ask-clarification/agent-ask-clarification.workflow.ts), [`AgentAskForApprovalWorkflow`](./src/agent-ask-for-approval/agent-ask-for-approval.workflow.ts)                                                                                                                  |
| A predefined workflow that just needs a quick generic ask — one free-text field, yes/no, pick-one — and you don't want to design a form | **Sub-workflow shortcut** — `AskUserWorkflow` / `ConfirmUserWorkflow` from `@loopstack/hitl`        | [`AskUserTextWorkflow`](./src/ask-user-text/ask-user-text.workflow.ts), [`AskUserOptionsWorkflow`](./src/ask-user-options/ask-user-options.workflow.ts), [`AskUserConfirmWorkflow`](./src/ask-user-confirm/ask-user-confirm.workflow.ts), [`ConfirmContentWorkflow`](./src/confirm-content/confirm-content.workflow.ts) |

## Why custom document is the default for predefined workflows

The HITL sub-workflows (`AskUserWorkflow`, `ConfirmUserWorkflow`) were designed primarily for **agent loops**, where the LLM doesn't know in advance what it will need to ask — at runtime it picks a question and a presentation mode and the agent tool wraps a generic sub-workflow around it.

In your own predefined workflow you already know what you need from the user. Owning the document means the form _is_ the structured data: the same record holds the prompt, the user's edits, and the final answer. The wait-transition payload schema is also your document schema, so types line up end-to-end with no wrapping or unpacking.

The sub-workflow shortcut is still useful — when the ask is small and generic, designing a form is overkill. Treat it as exactly that: a shortcut, not the primary pattern.

## What each workflow shows

### Predefined workflow owns the UI (custom document)

- **`InlineFormWorkflow`** — defines a `FeedbackFormDocument` with a `widget: form` YAML config. The form's Submit button triggers a `submitFeedback` wait-transition; the transition payload conforms to the document schema. The same document is saved twice — once as the empty prompt, once with the submitted values.
- **`PromptInputChatWorkflow`** — workflow-level `widget: prompt-input` YAML with `enabledWhen: [waiting_for_user]`. Loops on user messages without any LLM, demonstrating the chat-style entry pattern that the LLM examples build on.

### LLM agent prompts the user

- **`AgentAskClarificationWorkflow`** — launches `AgentWorkflow` with `tools: ['ask_clarification']` and a system prompt that tells the LLM to ask the user when information is missing. The agent pauses its loop on each call and resumes once the user answers.
- **`AgentAskForApprovalWorkflow`** — same shape, with `tools: ['ask_for_approval']`. The LLM drafts content, then hands it to the user for explicit confirm/deny before finalizing.

### Sub-workflow shortcut (predefined workflow, generic ask)

- **`AskUserTextWorkflow`** — `AskUserWorkflow.run({ question })` for a one-shot free-text answer.
- **`AskUserOptionsWorkflow`** — `mode: 'options'` with `allowCustomAnswer: true` for a pick-one list with a custom-text fallback.
- **`AskUserConfirmWorkflow`** — `mode: 'confirm'` for a quick yes/no decision; the answer is the literal string `'yes'` or `'no'`.
- **`ConfirmContentWorkflow`** — `ConfirmUserWorkflow.run({ markdown })` to show a pre-rendered markdown blob for review; the callback receives `{ confirmed: boolean, markdown: string }`.

## Installation

```bash
npm install @loopstack/hitl-example-module
```

Register the module. Use `forFeature` to provide an LLM configuration for the two agent workflows:

```typescript
import { Module } from '@nestjs/common';
import { HitlExampleModule } from '@loopstack/hitl-example-module';

@Module({
  imports: [
    HitlExampleModule.forFeature({
      llm: {
        providers: [
          /* claude or openai provider config */
        ],
      },
    }),
  ],
})
export class MyModule {}
```

The four non-agent workflows (`InlineFormWorkflow`, `PromptInputChatWorkflow`, `AskUser*Workflow`, `ConfirmContentWorkflow`) work without any LLM provider configuration.

## Public API

- **Module:** `HitlExampleModule`
- **Workflows:** `InlineFormWorkflow`, `PromptInputChatWorkflow`, `AskUserTextWorkflow`, `AskUserOptionsWorkflow`, `AskUserConfirmWorkflow`, `ConfirmContentWorkflow`, `AgentAskClarificationWorkflow`, `AgentAskForApprovalWorkflow`
- **Documents:** `FeedbackFormDocument` (used by `InlineFormWorkflow`)

## Dependencies

- `@loopstack/common`, `@loopstack/hitl` — HITL sub-workflows and agent tools
- `@loopstack/agent`, `@loopstack/llm-provider-module` — for the two agent examples

## Related

- [Human-in-the-Loop Patterns](https://loopstack.ai/docs/build/patterns/human-in-the-loop) — wait transitions, document actions, conditional widgets
- [`@loopstack/hitl`](https://loopstack.ai/registry/loopstack-hitl-module) — the underlying HITL module these examples use

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
