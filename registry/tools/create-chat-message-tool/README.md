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

Inject the tool in your workflow class using the @InjectTool() decorator:

```typescript
import { InjectTool, Workflow } from '@loopstack/common';
import { CreateChatMessage } from './create-chat-message-tool';

@Workflow({
  configFile: __dirname + '/my.workflow.yaml',
})
export class MyWorkflow {
  @InjectTool() createChatMessage: CreateChatMessage;
}
```

And use it in your YAML workflow configuration:

```yaml
# src/my.workflow.yaml
transitions:
  - id: send_welcome
    from: start
    to: ready
    call:
      # Create a single message
      - tool: createChatMessage
        args:
          role: assistant
          content: |
            Hello! I'm your assistant. How can I help you today?

  - id: send_conversation
    from: ready
    to: complete
    call:
      # Create multiple messages at once
      - tool: createChatMessage
        args:
          - role: user
            content: What's the weather like?
          - role: assistant
            content: I'll check the weather for you right away.
```

## About

Author: Jakob Klippel

License: Apache-2.0

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples how to use this tool look for `@loopstack/create-chat-message-tool` in the [Loopstack Registry](https://loopstack.ai/registry)
