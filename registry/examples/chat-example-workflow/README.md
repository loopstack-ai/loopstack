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
- Access LLM results via the `runtime` object

This example is useful for developers building chatbots, virtual assistants, or any conversational AI interface.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

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
                  Use available tools to help the user with their requests.
```

#### 2. LLM Response Generation

When the workflow reaches the `ready` state, it calls the LLM to generate a response based on the conversation history. The tool call is given an `id` so its result can be referenced later via the `runtime` object:

```yaml
- id: prompt
  from: ready
  to: prompt_executed
  call:
    - id: llm_call
      tool: aiGenerateText
      args:
        llm:
          provider: openai
          model: gpt-4o
        messagesSearchTag: message
```

#### 3. Storing the LLM Response

After the LLM generates a response, the result is stored as a document. The response data is accessed through `runtime.tools.prompt.llm_call.data`, which references the result of the `llm_call` tool in the `prompt` transition:

```yaml
- id: add_response
  from: prompt_executed
  to: waiting_for_user
  call:
    - tool: createDocument
      args:
        document: aiMessageDocument
        update:
          content: ${{ runtime.tools.prompt.llm_call.data }}
```

#### 4. Custom UI Actions

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

#### 5. Manual Trigger for User Input

User messages are handled through a manually triggered transition that captures the input payload:

```yaml
- id: user_message
  from: waiting_for_user
  to: ready
  trigger: manual
  call:
    - id: prompt_message
      tool: createDocument
      args:
        document: aiMessageDocument
        update:
          content:
            role: user
            parts:
              - type: text
                text: ${{ runtime.transition.payload }}
```

### Workflow Class

The TypeScript workflow class declares the tools, documents, and runtime types used in the YAML definition:

```typescript
import { ToolResult } from '@loopstack/common';

@Workflow({
  configFile: __dirname + '/chat.workflow.yaml',
})
export class ChatWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() aiGenerateText: AiGenerateText;
  @InjectDocument() aiMessageDocument: AiMessageDocument;

  @Runtime()
  runtime: {
    tools: Record<'prompt', Record<'llm_call', ToolResult<AiMessageDocumentContentType>>>;
  };
}
```

The `@Runtime()` decorator provides typed access to tool results. Here, `runtime.tools.prompt.llm_call` gives access to the result of the `llm_call` tool executed in the `prompt` transition.

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
