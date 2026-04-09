# @loopstack/create-chat-message-tool

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a tool for creating chat messages within workflows, enabling conversational interfaces and message-based interactions.

## Overview

The Create Chat Message Tool enables workflows to generate chat messages programmatically. It supports creating single or multiple messages in one operation, making it ideal for building conversational workflows, chatbots, and interactive assistants.

By using this tool, you'll be able to:

- Create single or multiple chat messages in one operation
- Define message roles (user, assistant, system, etc.)
- Build conversational workflows with proper message formatting
- Display workflow responses in a chat-like interface
- Integrate seamlessly with AI-powered chat workflows

This tool is essential for workflows that need to communicate with users through a conversational interface or build AI-powered assistants.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## Usage

Inject the tool in your workflow class using the `@InjectTool()` decorator:

```typescript
import { BaseWorkflow, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Workflow({
  uiConfig: __dirname + '/my.ui.yaml',
})
export class MyWorkflow extends BaseWorkflow {
  @InjectTool() createChatMessage: CreateChatMessage;

  @Initial({ to: 'ready' })
  async sendWelcome() {
    // Create a single message
    await this.createChatMessage.call({
      role: 'assistant',
      content: "Hello! I'm your assistant. How can I help you today?",
    });
  }

  @Transition({ from: 'ready', to: 'waiting', wait: true })
  async userInput() {
    // Wait for user input
  }

  @Final({ from: 'waiting' })
  async sendResponse() {
    // Create multiple messages at once
    await this.createChatMessage.call([
      { role: 'assistant', content: 'Thanks for your message!' },
      { role: 'assistant', content: 'Here is your response.' },
    ]);
  }
}
```

## About

Author: Jakob Klippel

License: Apache-2.0

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples how to use this tool look for `@loopstack/create-chat-message-tool` in the [Loopstack Registry](https://loopstack.ai/registry)
