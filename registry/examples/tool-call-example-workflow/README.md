# @loopstack/tool-call-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to enable LLM tool calling (function calling) with custom tools.

## Overview

The Tool Call Example Workflow shows how to build agentic workflows where the LLM can invoke custom tools and receive their results. It demonstrates this by asking about the weather in Berlin, where the LLM calls a `GetWeather` tool to fetch the information.

By using this workflow as a reference, you'll learn how to:

- Create custom tools with the `@Tool` decorator and `BaseTool`
- Pass tools to the LLM using the `tools` parameter
- Use `@Guard` decorators for conditional transition routing
- Handle tool call responses with `DelegateToolCalls`
- Store workflow state as instance properties
- Build agentic loops that continue until the LLM has a final answer

This example is essential for developers building AI agents that need to interact with external systems or APIs.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Key Concepts

#### 1. Creating Custom Tools

Define a tool by extending `BaseTool` and using the `@Tool` decorator with a description and a Zod schema for arguments:

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: { description: 'Retrieve weather information.' },
  schema: z.object({ location: z.string() }),
})
export class GetWeather extends BaseTool {
  async call(_args: unknown): Promise<ToolResult> {
    return Promise.resolve({
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.',
    });
  }
}
```

The `description` in `uiConfig` is passed to the LLM to help it understand when to use the tool.

#### 2. Registering Tools in the Workflow

Register custom tools and built-in tools using the `@InjectTool()` decorator:

```typescript
@Workflow({ uiConfig: __dirname + '/tool-call.ui.yaml' })
export class ToolCallWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() getWeather: GetWeather;
```

#### 3. Passing Tools to the LLM

Provide tools to the LLM via the `tools` parameter. The LLM will decide whether to call a tool based on the user's request:

```typescript
@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn() {
  const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
    claude: { model: 'claude-sonnet-4-6' },
    messagesSearchTag: 'message',
    tools: ['getWeather'],
  });
  this.llmResult = result.data;
}
```

The result is stored as an instance property for use in routing and subsequent transitions.

#### 4. Guard-Based Conditional Routing

Use the `@Guard` decorator to conditionally enable transitions. Guards reference methods on the workflow class that return a boolean:

```typescript
@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls() {
  const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.call({
    message: this.llmResult!,
    document: ClaudeMessageDocument,
  });
  this.delegateResult = result.data;
}

hasToolCalls() {
  return this.llmResult?.stop_reason === 'tool_use';
}
```

The `priority: 10` ensures this transition is evaluated before the `@Final` transition when both could match.

#### 5. Delegating Tool Execution

The `DelegateToolCalls` tool executes the tool calls requested by the LLM and saves the results as documents:

```typescript
const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.call({
  message: this.llmResult!,
  document: ClaudeMessageDocument,
});
this.delegateResult = result.data;
```

#### 6. Waiting for Tool Completion

A guard checks whether all delegated tool calls have completed before looping back for another LLM turn:

```typescript
@Transition({ from: 'awaiting_tools', to: 'ready' })
@Guard('allToolsComplete')
async toolsComplete() {}

allToolsComplete() {
  return this.delegateResult?.allCompleted;
}
```

#### 7. Agentic Loop Pattern

The workflow implements an agentic loop:

1. **LLM Turn** (`ready` -> `prompt_executed`) -- The LLM processes messages and may request tool calls
2. **Execute Tool Calls** (`prompt_executed` -> `awaiting_tools`) -- If `stop_reason === 'tool_use'`, delegate tool execution
3. **Tools Complete** (`awaiting_tools` -> `ready`) -- When all tools finish, loop back for another LLM turn
4. **Final Response** (`prompt_executed` -> end) -- If no tool calls, save the final response

```typescript
@Final({ from: 'prompt_executed' })
async respond() {
  await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
}
```

This pattern allows the LLM to make multiple tool calls before providing a final response.

### Workflow Class

The complete workflow class:

```typescript
import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  DelegateToolCalls,
  DelegateToolCallsResult,
} from '@loopstack/claude-module';
import { BaseWorkflow, Final, Guard, Initial, InjectTool, ToolResult, Transition, Workflow } from '@loopstack/common';
import { GetWeather } from './tools/get-weather.tool';

@Workflow({ uiConfig: __dirname + '/tool-call.ui.yaml' })
export class ToolCallWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() getWeather: GetWeather;

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;

  @Initial({ to: 'ready' })
  async setup() {
    await this.repository.save(ClaudeMessageDocument, { role: 'user', content: 'How is the weather in Berlin?' });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
      tools: ['getWeather'],
    });
    this.llmResult = result.data;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.call({
      message: this.llmResult!,
      document: ClaudeMessageDocument,
    });
    this.delegateResult = result.data;
  }

  hasToolCalls() {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async toolsComplete() {}

  allToolsComplete() {
    return this.delegateResult?.allCompleted;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework functionality, `BaseWorkflow`, `BaseTool`, decorators
- `@loopstack/claude-module` - Provides `ClaudeGenerateText`, `DelegateToolCalls` tools, `ClaudeMessageDocument`, and result types

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
