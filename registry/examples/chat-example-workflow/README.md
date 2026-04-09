# @loopstack/chat-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to build an interactive chat interface with an LLM.

## Overview

The Chat Example Workflow shows how to create a conversational assistant that processes user messages and generates responses using an LLM. It demonstrates the core patterns for building chat-based applications in Loopstack.

By using this workflow as a reference, you'll learn how to:

- Set up a system prompt using a Handlebars template file
- Use `wait: true` to pause the workflow for user input
- Process user messages through an LLM with `ClaudeGenerateText`
- Create a message loop for continuous conversation
- Configure custom UI widgets for user input
- Save documents with the workflow repository

This example is useful for developers building chatbots, virtual assistants, or any conversational AI interface.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Key Concepts

#### 1. System Prompt Setup

The workflow begins with an `@Initial` method that saves a hidden system message. The message content is rendered from a Handlebars template file:

```typescript
@Initial({ to: 'waiting_for_user' })
async setup() {
  await this.repository.save(
    ClaudeMessageDocument,
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
  await this.repository.save(ClaudeMessageDocument, { role: 'user', content: payload });
}
```

When the user sends a message, the payload is saved as a `ClaudeMessageDocument` and the workflow transitions to the `ready` state.

#### 3. LLM Response Generation

When the workflow reaches the `ready` state, it calls the LLM to generate a response based on the full conversation history using `messagesSearchTag`:

```typescript
@Transition({ from: 'ready', to: 'waiting_for_user' })
async llmTurn() {
  const result = await this.claudeGenerateText.call({
    claude: { model: 'claude-sonnet-4-6' },
    messagesSearchTag: 'message',
  });
  await this.repository.save(ClaudeMessageDocument, result.data!, { id: result.data!.id });
}
```

The `messagesSearchTag: 'message'` parameter retrieves all saved `ClaudeMessageDocument` entries as conversation context. The LLM response is saved and the workflow loops back to `waiting_for_user`.

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

The complete workflow class uses `@InjectTool()` to access the `ClaudeGenerateText` tool and extends `BaseWorkflow`:

```typescript
import { z } from 'zod';
import { ClaudeGenerateText, ClaudeMessageDocument } from '@loopstack/claude-module';
import { BaseWorkflow, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/chat.ui.yaml',
})
export class ChatWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.repository.save(
      ClaudeMessageDocument,
      { role: 'user', content: this.render(__dirname + '/templates/systemMessage.md') },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(ClaudeMessageDocument, { role: 'user', content: payload });
  }

  @Transition({ from: 'ready', to: 'waiting_for_user' })
  async llmTurn() {
    const result = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
    });
    await this.repository.save(ClaudeMessageDocument, result.data!, { id: result.data!.id });
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework functionality, `BaseWorkflow`, decorators
- `@loopstack/claude-module` - Provides `ClaudeGenerateText` tool and `ClaudeMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
