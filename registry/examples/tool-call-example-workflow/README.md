# @loopstack/tool-call-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to enable LLM tool calling (function calling) with custom tools.

## Overview

The Tool Call Example Workflow shows how to build agentic workflows where the LLM can invoke custom tools and receive their results. It demonstrates this by asking about the weather in Berlin, where the LLM calls a `getWeather` tool to fetch the information.

By using this workflow as a reference, you'll learn how to:

- Create custom tools that the LLM can invoke
- Pass tools to the LLM using the `tools` parameter
- Use helper functions for conditional routing
- Handle tool call responses with `delegateToolCall`
- Build agentic loops that continue until the LLM has a final answer

This example is essential for developers building AI agents that need to interact with external systems or APIs.

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
loopstack add @loopstack/tool-call-example-workflow
```

This copies the source files into your `src` directory.

> Using the `loopstack add` command is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `ToolCallingExampleModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { ToolCallingExampleModule } from './@loopstack/tool-call-example-workflow';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule, ToolCallingExampleModule],
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
import { ToolCallWorkflow } from './@loopstack/tool-call-example-workflow';

@Injectable()
@BlockConfig({
  config: {
    title: 'My Workspace',
    description: 'A workspace with the tool calling example workflow',
  },
})
export class MyWorkspace extends WorkspaceBase {
  @Workflow() toolCallWorkflow: ToolCallWorkflow;
}
```

### 3. Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```

## How It Works

### Key Concepts

#### 1. Creating Custom Tools

Define a tool by extending `ToolBase` with a Zod schema for arguments:

```typescript
@Injectable()
@BlockConfig({
  config: {
    description: 'Retrieve weather information.',
  },
})
@WithArguments(
  z.object({
    location: z.string(),
  }),
)
export class GetWeather extends ToolBase {
  async execute(): Promise<ToolResult> {
    return {
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.',
    };
  }
}
```

The `description` in `@BlockConfig` is passed to the LLM to help it understand when to use the tool.

#### 2. Registering Tools in the Workflow

Register custom tools using the `@Tool()` decorator:

```typescript
export class ToolCallWorkflow extends WorkflowBase {
  @Tool() getWeather: GetWeather;
  // ...
}
```

#### 3. Passing Tools to the LLM

Provide tools to the LLM via the `tools` parameter:

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

The LLM will decide whether to call a tool based on the user's request.

#### 4. Helper Functions for Routing

Define helper functions using the `@Helper()` decorator for use in conditional expressions:

```typescript
@Helper()
isToolCall(message: any) {
  return message?.parts.some((part: any) => part.type.startsWith('tool-'));
}
```

Use helpers in transition conditions:

```yaml
- id: route_with_tool_calls
  from: prompt_executed
  to: ready
  if: '{{ isToolCall llmResponse }}'
```

#### 5. Executing Tool Calls

Use `delegateToolCall` to execute the tool the LLM requested:

```yaml
- tool: delegateToolCall
  args:
    message: ${ llmResponse }
  assign:
    toolCallResult: ${ result.data }
```

This automatically routes to the correct tool based on the LLM's response.

#### 6. Agentic Loop Pattern

The workflow implements an agentic loop:

1. **LLM Turn** - The LLM processes messages and may request a tool call
2. **Route with Tool Calls** - If the LLM requested a tool, execute it and loop back
3. **Route without Tool Calls** - If no tool call, the LLM has finished and the workflow ends

```yaml
- id: route_with_tool_calls
  from: prompt_executed
  to: ready # Loop back for another LLM turn
  if: '{{ isToolCall llmResponse }}'

- id: route_without_tool_calls
  from: prompt_executed
  to: end # Workflow complete
```

This pattern allows the LLM to make multiple tool calls before providing a final response.

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/core-ui-module` - Provides `CreateDocument` tool
- `@loopstack/ai-module` - Provides `AiGenerateText`, `DelegateToolCall` tools and `AiMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
