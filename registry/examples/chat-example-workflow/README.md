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

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/chat-example-workflow
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/chat-example-workflow
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```

### 2. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `ChatExampleModule` to the imports of `default.module.ts` or any other custom module.
- Inject the `ChatWorkflow` workflow to your workspace class using the `@Workflow()` decorator.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

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
