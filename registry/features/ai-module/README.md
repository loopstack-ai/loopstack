# @loopstack/ai-module

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides tools for integrating Large Language Models (LLMs) into your workflows, with support for OpenAI and Anthropic providers.

## Overview

The AI Module enables workflows to leverage LLM capabilities for text generation, structured object generation, and agentic tool calling patterns. It abstracts provider-specific implementations behind a unified interface.

By using this module, you'll be able to:

- Generate text responses using OpenAI or Anthropic models
- Generate structured objects that conform to document schemas
- Build agentic workflows with LLM tool calling
- Create AI-powered conversational interfaces

This module is essential for workflows that need natural language processing, content generation, or AI-driven decision making.

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

### Install the Module

#### As Node Dependency via Npm:

```bash
npm install --save @loopstack/ai-module
```

#### OR: Copy Sources via Loopstack CLI

```bash
loopstack add @loopstack/ai-module
```

### Configure API Keys

Set your provider API keys as environment variables:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

## Setup

### 1. Import the Module

Add `AiModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule, AiModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Use in Your Workflow

Inject the tools and documents in your workflow class:

```typescript
import { Injectable } from '@nestjs/common';
import {
  AiGenerateDocument,
  AiGenerateObject,
  AiGenerateText,
  AiMessageDocument,
  DelegateToolCall,
} from '@loopstack/ai-module';
import { BlockConfig, Document, Helper, Tool } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/my.workflow.yaml',
})
export class MyWorkflow extends WorkflowBase {
  // Tools
  @Tool() aiGenerateText: AiGenerateText;
  @Tool() aiGenerateObject: AiGenerateObject;
  @Tool() aiGenerateDocument: AiGenerateDocument;
  @Tool() delegateToolCall: DelegateToolCall;

  // Documents
  @Document() aiMessageDocument: AiMessageDocument;
}
```

## Tool Reference

### AiGenerateText

Generates text using an LLM with optional tool calling support.

#### Arguments

| Argument            | Type     | Required | Description                                          |
| ------------------- | -------- | -------- | ---------------------------------------------------- |
| `llm.provider`      | string   | No       | Provider name (`openai` or `anthropic`)              |
| `llm.model`         | string   | No       | Model identifier (e.g., `gpt-4o`, `claude-3-sonnet`) |
| `llm.envApiKey`     | string   | No       | Environment variable name for API key                |
| `prompt`            | string   | No       | Simple text prompt                                   |
| `messages`          | array    | No       | Array of message objects with `role` and `content`   |
| `messagesSearchTag` | string   | No       | Tag to search for messages in workflow documents     |
| `tools`             | string[] | No       | Array of tool names to make available to the LLM     |

#### Example

```yaml
- tool: aiGenerateText
  args:
    llm:
      provider: openai
      model: gpt-4o
    messagesSearchTag: message
    tools:
      - getWeather
  assign:
    llmResponse: ${ result.data }
```

### AiGenerateObject

Generates a structured object using an LLM that conforms to a document schema.

#### Arguments

| Argument            | Type   | Required | Description                                             |
| ------------------- | ------ | -------- | ------------------------------------------------------- |
| `llm.provider`      | string | No       | Provider name                                           |
| `llm.model`         | string | No       | Model identifier                                        |
| `prompt`            | string | No       | Simple text prompt                                      |
| `messages`          | array  | No       | Array of message objects                                |
| `messagesSearchTag` | string | No       | Tag to search for messages                              |
| `response.document` | string | Yes      | Document name whose schema defines the output structure |
| `response.id`       | string | No       | Custom ID for the generated object                      |

#### Example

```yaml
- tool: aiGenerateObject
  args:
    llm:
      provider: anthropic
      model: claude-3-sonnet
    prompt: 'Extract the key information from this text: {{ inputText }}'
    response:
      document: infoDocument
  assign:
    entities: ${ result.data }
```

### AiGenerateDocument

Combines `AiGenerateObject` and `CreateDocument` into a single operation. Generates a structured object and immediately creates it as a document.

#### Arguments

Same as `AiGenerateObject`. The generated object is automatically created as a document using the specified document type.

#### Example

```yaml
- tool: aiGenerateDocument
  args:
    llm:
      provider: openai
      model: gpt-4o
    messagesSearchTag: message
    response:
      document: summaryDocument
```

### DelegateToolCall

Executes tool calls requested by the LLM and returns the results in the expected format.

#### Arguments

| Argument        | Type   | Required | Description                                                     |
| --------------- | ------ | -------- | --------------------------------------------------------------- |
| `message`       | object | Yes      | The LLM response message containing tool call parts             |
| `message.id`    | string | Yes      | Message identifier                                              |
| `message.parts` | array  | Yes      | Array of tool call parts with `type`, `input`, and `toolCallId` |

#### Example

```yaml
- tool: delegateToolCall
  args:
    message: ${ llmResponse }
  assign:
    toolCallResult: ${ result.data }
```

## Document Types

### AiMessageDocument

Represents an AI conversation message with support for multi-part content (text, tool calls, tool results).

**Schema:**

```typescript
{
  id?: string;                          // Message identifier
  role: 'system' | 'user' | 'assistant'; // Message role
  metadata?: any;                        // Optional metadata
  parts: any[];                          // Message content parts
}
```

**Example:**

```yaml
- tool: createDocument
  args:
    document: aiMessageDocument
    update:
      content:
        role: user
        parts:
          - type: text
            text: How is the weather in Berlin?
```

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples how to use this module look for `@loopstack/ai-module` in the [Loopstack Registry](https://loopstack.ai/registry)
