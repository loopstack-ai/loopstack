---
title: HITL Examples
description: Workflow examples for Human-in-the-Loop patterns in Loopstack — custom Document with a form widget, AskUserWorkflow / ConfirmUserWorkflow sub-workflow shortcuts, LLM agent loops with ask_clarification / ask_for_approval, and an end-to-end meeting-notes review flow.
---

# @loopstack/hitl-examples

> Human-in-the-Loop workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Side-by-side examples of every way to pause a Loopstack workflow for the user. The point of this package is to answer one question: **when do I design a custom document with a widget, vs. delegate to a HITL sub-workflow, vs. let an LLM agent ask the user?**

## Decision matrix

| You are building...                                                                                                                     | Use                                                                                                 | Examples                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A predefined workflow with known user-input steps — form fields, structured data, a record the user edits                               | **Custom document with a widget** — your workflow owns the document and the `wait: true` transition | Inline Form, Prompt Input Chat, Meeting Notes                      |
| An LLM agent loop where the LLM dynamically decides to ask the user something or request approval                                       | **Agent tools** `ask_clarification` / `ask_for_approval` from `@loopstack/hitl`                     | Agent Ask Clarification, Agent Ask For Approval                    |
| A predefined workflow that just needs a quick generic ask — one free-text field, yes/no, pick-one — and you don't want to design a form | **Sub-workflow shortcut** — `AskUserWorkflow` / `ConfirmUserWorkflow` from `@loopstack/hitl`        | Ask User Text, Ask User Options, Ask User Confirm, Confirm Content |

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/hitl-examples src/hitl-examples
```

Then register the module in your app:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { HitlExamplesModule } from './hitl-examples/hitl-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), HitlExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/hitl-examples
```

```typescript
import { HitlExamplesModule } from '@loopstack/hitl-examples';
```

## Environment

The agent and meeting-notes examples require Claude credentials:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

The non-agent examples (Inline Form, Prompt Input Chat, Ask User \*, Confirm Content) work without any LLM provider.

## Examples

| Example                                             | Studio title                             | Description                                                                           |
| --------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| [Inline Form](#inline-form)                         | `HITL - Inline Form Example`             | Custom Document with a form widget, `wait: true` payload typed by the document schema |
| [Prompt Input Chat](#prompt-input-chat)             | `HITL - Prompt Input Chat Example`       | Workflow-level prompt-input widget; loops on user messages without an LLM             |
| [Ask User Text](#ask-user-text)                     | `HITL - Ask User Text Example`           | `AskUserWorkflow` for a generic free-text question                                    |
| [Ask User Options](#ask-user-options)               | `HITL - Ask User Options Example`        | `AskUserWorkflow` with `mode: 'options'` and `allowCustomAnswer`                      |
| [Ask User Confirm](#ask-user-confirm)               | `HITL - Ask User Confirm Example`        | `AskUserWorkflow` with `mode: 'confirm'` for yes/no decisions                         |
| [Confirm Content](#confirm-content)                 | `HITL - Confirm Content Example`         | `ConfirmUserWorkflow` to show a pre-rendered markdown blob for explicit approval      |
| [Agent Ask Clarification](#agent-ask-clarification) | `HITL - Agent Ask Clarification Example` | LLM agent with `ask_clarification` tool — pauses to request missing info              |
| [Agent Ask For Approval](#agent-ask-for-approval)   | `HITL - Agent Ask For Approval Example`  | LLM agent with `ask_for_approval` tool — drafts content and pauses for confirm/deny   |
| [Meeting Notes](#meeting-notes)                     | `HITL - Meeting Notes Example`           | End-to-end document-review flow: user notes → LLM-extracted structure → user approval |

---

## Inline Form

The workflow owns a `FeedbackFormDocument` whose schema doubles as the `wait: true` transition payload. The form's Submit button triggers the transition with typed data — no wrapping or unpacking.

### Files

- `inline-form-example.workflow.ts` — workflow class
- `feedback-form-document.ts` — `@Document` with Zod schema
- `feedback-form-document.yaml` — form widget definition

## Prompt Input Chat

Workflow-level `widget: prompt-input` with `enabledWhen: [waiting_for_user]`. Loops on user messages and echoes them back — no LLM and no sub-workflow involved. Demonstrates the chat-style entry pattern that LLM agent loops are built on.

### Files

- `prompt-input-chat-example.workflow.ts` — workflow class
- `prompt-input-chat-example.workflow.yaml` — workflow-level prompt-input widget

## Ask User Text

Delegate a generic free-text question to `AskUserWorkflow`. The parent workflow only owns the callback transition that receives the answer. Use the inline-form pattern instead when you need a structured form.

### Files

- `ask-user-text-example.workflow.ts` — workflow class

## Ask User Options

Delegate a "pick one from a list" question to `AskUserWorkflow` with `mode: 'options'`. `allowCustomAnswer: true` adds a free-text field next to the choices.

### Files

- `ask-user-options-example.workflow.ts` — workflow class

## Ask User Confirm

Delegate a yes/no decision to `AskUserWorkflow` with `mode: 'confirm'`. The answer comes back as the literal string `'yes'` or `'no'`.

### Files

- `ask-user-confirm-example.workflow.ts` — workflow class

## Confirm Content

Hand a pre-rendered markdown blob to `ConfirmUserWorkflow` for a user-facing review. The callback receives `{ confirmed: boolean, markdown: string }`. Useful for showing a release plan, summary, or diff for explicit approval.

### Files

- `confirm-content-example.workflow.ts` — workflow class

## Agent Ask Clarification

Launches `AgentWorkflow` with `tools: ['ask_clarification']`. When the LLM lacks information, it issues an `ask_clarification` tool call — the loop pauses and prompts the user, then the answer flows back into the agent context.

### Files

- `agent-ask-clarification-example.workflow.ts` — workflow class

## Agent Ask For Approval

Launches `AgentWorkflow` with `tools: ['ask_for_approval']`. The LLM drafts content (release notes, in this example), then calls `ask_for_approval` with the markdown — the loop pauses until the user explicitly confirms or denies.

### Files

- `agent-ask-for-approval-example.workflow.ts` — workflow class

## Meeting Notes

A complete HITL document-review flow:

1. Save a `MeetingNotesDocument` with the user's raw notes (form widget for edits)
2. User reviews/edits and submits via `wait: true` transition
3. `LlmGenerateObjectTool` extracts structured data via Zod schema
4. Save `OptimizedNotesDocument` for the user to review/approve
5. Final approval via second `wait: true` transition

Combines custom documents, LLM-driven structured output, and two HITL review steps.

### Files

- `meeting-notes-example.workflow.ts` — workflow class
- `documents/meeting-notes-document.{ts,yaml}` — input form document
- `documents/optimized-notes-document.{ts,yaml}` — structured output document
- `templates/extract-notes.md` — LLM prompt template

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
