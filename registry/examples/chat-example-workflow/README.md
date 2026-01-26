# @loopstack/chat-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to build an interactive chat interface with an LLM.

## Overview

The Chat Example Workflow shows how to create a conversational assistant that processes user messages and generates responses using an LLM. It demonstrates the core patterns for building chat-based applications in Loopstack.

By using this workflow as a reference, you'll learn how to:

- Set up a system prompt to define assistant behavior
- Process user messages through an LLM
- Create a message loop for continuous conversation
- Configure custom UI actions for user input

This example is useful for developers building chatbots, virtual assistants, or any conversational AI interface.

## Installation

### Prerequisites

Create a new Loopstack project if you haven't already:

```bash
npx create-loopstack-app my-project
cd my-project
```

Start Environment

```bash
cd my-project
docker compose up -d
```

### Add the Module

```bash
loopstack add @loopstack/chat-example-workflow
```

This copies the source files into your `src` directory.

> Using the `loopstack add` command is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `ChatExampleModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { ChatExampleModule } from './@loopstack/chat-example-workflow';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule, CoreUiModule, AiModule, ChatExampleModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Register in Your Workspace

Add the workflow to your workspace class using the `@Workflow()` decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { BlockConfig, Workflow } from '@loopstack/common';
import { WorkspaceBase } from '@loopstack/core';
import { ChatWorkflow } from './@loopstack/chat-example-workflow';

@Injectable()
@BlockConfig({
  config: {
    title: 'My Workspace',
    description: 'A workspace with the chat example workflow',
  },
})
export class MyWorkspace extends WorkspaceBase {
  @Workflow() chatWorkflow: ChatWorkflow;
}
```

### 3. Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```

## How It Works

### Key Concepts

#### 1. System Prompt Setup

The workflow begins by creating a hidden system message that defines the assistant's behavior:

```yaml
- id: greeting
  from: start
  to: ready
  call:
    - tool: createDocument
      args:
        document: aiMessageDocument
        update:
          meta:
            hidden: true
          content:
            role: system
            parts:
              - type: text
                text: |
                  You are a helpful assistant named Bob.
                  Always tell the user your name.
```

#### 2. LLM Response Generation

When the workflow reaches the `ready` state, it calls the LLM to generate a response based on the conversation history:

```yaml
- id: prompt
  from: ready
  to: prompt_executed
  call:
    - tool: aiGenerateText
      args:
        llm:
          provider: openai
          model: gpt-4o
        messagesSearchTag: message
      assign:
        llmResponse: ${ result.data }
```

#### 3. Custom UI Actions

The workflow defines a custom UI action that allows users to send messages:

```yaml
ui:
  actions:
    - type: custom
      transition: user_message
      widget: prompt-input
      enabledWhen:
        - ready
      options:
        label: Send Message
```

#### 4. Manual Trigger for User Input

User messages are handled through a manually triggered transition that captures the input payload:

```yaml
- id: user_message
  from: waiting_for_user
  to: ready
  trigger: manual
  call:
    - tool: createDocument
      args:
        document: aiMessageDocument
        update:
          content:
            role: user
            parts:
              - type: text
                text: ${ transition.payload }
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/core-ui-module` - Provides `CreateDocument` tool
- `@loopstack/ai-module` - Provides `AiGenerateText` tool and `AiMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
