---
title: What is Loopstack
description: Overview of the Loopstack framework — stateful AI workflow engine built on NestJS with state machines, LLM tool calling, human-in-the-loop, retries, and a live monitoring UI.
---

# Introduction

Loopstack is a **TypeScript framework for building stateful AI workflows** on top of NestJS. It gives you state machines with automatic persistence, LLM tool calling loops, human-in-the-loop pauses, retries with backoff, and a live monitoring UI — all integrated into your existing NestJS backend.

## The Problem

Building reliable AI workflows in production is harder than it looks. You need state that survives server restarts, retries when tools fail, pauses for human review, and LLM tool calling loops that close correctly. Wiring all of that on top of BullMQ, TypeORM, and a frontend takes weeks — and still breaks in subtle ways.

Loopstack handles the infrastructure. You write TypeScript.

## What It Looks Like

A workflow that generates a draft, pauses for human approval, then completes:

```typescript
interface ReviewState {
  draft?: string;
}

@Workflow({ widget: __dirname + '/review.ui.yaml' })
export class ReviewWorkflow extends BaseWorkflow<Record<string, unknown>, ReviewState> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  // Step 1: Call the LLM, save the result, move to waiting state
  @Transition({ to: 'waiting_for_approval' })
  async generate(state: ReviewState): Promise<ReviewState> {
    const result = await this.llmGenerateText.call(
      { prompt: 'Write a one-paragraph product description for a coffee subscription.' },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );
    await this.documentStore.save(LlmMessageDocument, result.data!.message);
    return { ...state, draft: result.data!.message.content as string };
  }

  // Step 2: Workflow pauses here until the user clicks Approve in the Studio UI
  @Transition({ from: 'waiting_for_approval', to: 'end', wait: true })
  async approve(state: ReviewState): Promise<ReviewState> {
    return state;
  }
}
```

The workflow pauses at `waiting_for_approval` and waits — across restarts, deployments, and hours of inactivity. When the user clicks Approve in the Studio UI, it resumes. Failed transitions roll back automatically and retry with exponential backoff.

## Why Loopstack

**vs. raw BullMQ / custom queue code**
State persistence, rollback on failure, retries, and a live monitoring UI come built in. You write business logic, not infrastructure.

**vs. LangChain.js / LangGraph**
Loopstack is NestJS-native TypeScript. No custom runtimes or frameworks to learn. Your workflows are standard NestJS providers — they use constructor injection, share services, and sit alongside your existing code.

**vs. n8n / Zapier**
Entirely code-first. Every workflow is version-controlled TypeScript. No drag-and-drop lock-in, no vendor-managed infrastructure.

## Who It's For

Loopstack is for **NestJS developers** adding stateful AI automation to their backend.

If you're building:

- AI agents that call tools, loop, and recover from errors
- Workflows where humans review or approve AI-generated output
- Multi-step automations that coordinate across services and APIs
- Chat interfaces with full message history and tool access

...Loopstack is designed for this.

## Next Steps

- [Core Concepts](/docs/learn/core-concepts) — workflows, tools, documents, and the module system
- [Capabilities](/docs/learn/capabilities) — quick feature matrix to validate your use case
- [Getting Started](/docs/build/getting-started) — set up your first project in a few minutes
