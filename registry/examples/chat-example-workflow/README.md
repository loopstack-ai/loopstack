---
title: Chat Example
description: Example workflow building an interactive chat interface — system prompt setup, wait transitions, LlmGenerateTextTool, message loop, prompt-input widget
---

# @loopstack/chat-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to build an interactive chat interface with an LLM.

## Overview

The Chat Example Workflow shows how to create a conversational assistant that processes user messages and generates responses using an LLM. It demonstrates the core patterns for building chat-based applications in Loopstack.

By using this workflow as a reference, you'll learn how to:

- Set up a system prompt using a Handlebars template file
- Use `wait: true` to pause the workflow for user input
- Process user messages through an LLM with `LlmGenerateTextTool`
- Create a message loop for continuous conversation
- Configure custom UI widgets for user input
- Save documents with the workflow repository

This example is useful for developers building chatbots, virtual assistants, or any conversational AI interface.

## Installation

```bash
npm install @loopstack/chat-example-workflow
```

Then register the module in your app:

```typescript
import { ChatExampleModule, ChatWorkflow } from '@loopstack/chat-example-workflow';
import { StudioApp } from '@loopstack/common';

@StudioApp({
  title: 'Chat Example',
  workflows: [ChatWorkflow],
})
@Module({
  imports: [ChatExampleModule],
})
export class MyAppModule {}
```

Set your Anthropic API key as an environment variable:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## How It Works

### Key Concepts

#### 1. System Prompt Setup

The workflow begins with an start `@Transition` method that saves a hidden system message. The message content is rendered from a Handlebars template file:

```typescript
@Transition({ to: 'waiting_for_user' })
async setup() {
  await this.documentStore.save(
    LlmMessageDocument,
    { role: 'user', content: this.render(__dirname + '/templates/systemMessage.md') },
    { meta: { hidden: true } },
  );
}
```

The `{ meta: { hidden: true } }` option ensures the system message is included in the LLM context but not displayed in the chat UI.

#### 2. Waiting for User Input

The `userMessage` transition uses `wait: true` to pause the workflow and wait for external input. A Zod schema defines the expected payload type:

```typescript
@Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
async userMessage(payload: string) {
  await this.documentStore.save(LlmMessageDocument, { role: 'user', content: payload });
}
```

When the user sends a message, the payload is saved as a `LlmMessageDocument` and the workflow transitions to the `ready` state.

#### 3. LLM Response Generation

When the workflow reaches the `ready` state, it calls the LLM to generate a response. Provider and model are passed via the `config` option at call time:

```typescript
@Transition({ from: 'ready', to: 'waiting_for_user' })
async llmTurn(state: Record<string, unknown>): Promise<Record<string, unknown>> {
  const result = await this.llmGenerateText.call(
    {},
    { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
  );

  await this.documentStore.save(LlmMessageDocument, result.data!.message, {
    meta: { response: result.data!.response, provider: (result.metadata as { provider: string })?.provider },
  });
  return state;
}
```

The LLM response is saved as a `LlmMessageDocument` and the workflow loops back to `waiting_for_user`.

#### 4. Custom UI Widgets

The workflow defines a prompt input widget that is enabled when waiting for user input:

```yaml
ui:
  widgets:
    - widget: prompt-input
      enabledWhen:
        - waiting_for_user
      options:
        transition: userMessage
        label: Send Message
```

The `transition: userMessage` connects the widget to the `userMessage` method, and `enabledWhen` controls when the input is active.

### Workflow Class

The complete workflow class uses constructor injection to access the `LlmGenerateTextTool` tool and extends `BaseWorkflow`. Provider and model config is passed at call time via `{ config: { ... } }`:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({
  title: 'LLM Chat Example (Assistant Bob)',
  description: 'An example workflow that demonstrates how to create a simple chat interface.',
  widget: __dirname + '/chat.ui.yaml',
})
export class ChatWorkflow extends BaseWorkflow {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async setup(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'user', content: this.render(__dirname + '/templates/systemMessage.md') },
      { meta: { hidden: true } },
    );
    return state;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: Record<string, unknown>, payload: string): Promise<Record<string, unknown>> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', content: payload });
    return state;
  }

  @Transition({ from: 'ready', to: 'waiting_for_user' })
  async llmTurn(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.llmGenerateText.call({}, { config: { provider: 'claude', model: 'claude-sonnet-4-6' } });

    await this.documentStore.save(LlmMessageDocument, result.data!.message, {
      meta: { response: result.data!.response, provider: (result.metadata as { provider: string })?.provider },
    });
    return state;
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework functionality, `BaseWorkflow`, decorators
- `@loopstack/llm-provider-module` - Provides `LlmGenerateTextTool` tool and `LlmMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
