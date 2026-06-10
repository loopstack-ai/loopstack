---
title: Tool Calling Example
description: Example workflow enabling LLM tool calling (function calling) with custom tools — LlmGenerateTextTool, LlmDelegateToolCallsTool, tool registration
---

# @loopstack/tool-call-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to enable LLM tool calling (function calling) with custom tools.

## Overview

The Tool Call Example Workflow shows how to build agentic workflows where the LLM can invoke custom tools and receive their results. It demonstrates this by asking about the weather in Berlin, where the LLM calls a `GetWeather` tool to fetch the information.

By using this workflow as a reference, you'll learn how to:

- Create custom tools with the `@Tool` decorator and `BaseTool`
- Pass tools to the LLM using the `tools` array in the call-time `config`
- Use `@Guard` decorators for conditional transition routing
- Handle tool call responses with `LlmDelegateToolCallsTool`
- Manage workflow state via the `state` object passed through transitions
- Build agentic loops that continue until the LLM has a final answer

This example is essential for developers building AI agents that need to interact with external systems or APIs.

## Installation

```bash
npm install @loopstack/tool-call-example-workflow
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { ToolCallWorkflow, ToolCallingExampleModule } from '@loopstack/tool-call-example-workflow';

@StudioApp({
  title: 'Tool Call Example',
  workflows: [ToolCallWorkflow],
})
@Module({
  imports: [ToolCallingExampleModule],
})
export class MyAppModule {}
```

Set your Anthropic API key as an environment variable:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

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

#### 2. Injecting Tools in the Workflow

Tools are injected via standard NestJS constructor injection:

```typescript
@Workflow({ ... })
export class ToolCallWorkflow extends BaseWorkflow<Record<string, unknown>, ToolCallState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly getWeather: GetWeather,
  ) {
    super();
  }
```

#### 3. Passing Tools to the LLM

Provide tools to the LLM via the `tools` array in the `config` option at call time. The LLM will decide whether to call a tool based on the user's request:

```typescript
@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn(state: ToolCallState): Promise<ToolCallState> {
  const result = await this.llmGenerateText.call(
    {},
    { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
  );
  return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
}
```

The `provider`, `model`, `tools`, and other config fields are passed via `{ config: { ... } }` at call time. The result is stored in the state object for use in routing and subsequent transitions.

#### 4. Guard-Based Conditional Routing

Use the `@Guard` decorator to conditionally enable transitions. Guards reference methods on the workflow class that return a boolean:

```typescript
@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: ToolCallState): Promise<ToolCallState> {
  await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
    meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
  });
  const result = await this.llmDelegateToolCalls.call({
    message: state.llmResult!.message,
  });
  return { ...state, delegateResult: result.data };
}

hasToolCalls(state: ToolCallState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

The `priority: 10` ensures this transition is evaluated before the terminal `@Transition` when both could match.

#### 5. Delegating Tool Execution

The `LlmDelegateToolCallsTool` tool executes the tool calls from the LLM response message:

```typescript
const result = await this.llmDelegateToolCalls.call({
  message: state.llmResult!.message,
});
return { ...state, delegateResult: result.data };
```

#### 6. Waiting for Tool Completion

A guard checks whether all delegated tool calls have completed before looping back for another LLM turn:

```typescript
@Transition({ from: 'awaiting_tools', to: 'ready' })
@Guard('allToolsComplete')
async toolsComplete(state: ToolCallState): Promise<ToolCallState> {
  await this.documentStore.save(LlmMessageDocument, {
    role: 'user',
    content: state.delegateResult!.toolResults.map((tr) => ({
      type: 'tool_result' as const,
      toolCallId: tr.toolCallId,
      content: tr.content ?? '',
      isError: tr.isError ?? false,
    })),
  });
  return state;
}

allToolsComplete(state: ToolCallState): boolean {
  return state.delegateResult?.allCompleted ?? false;
}
```

#### 7. Agentic Loop Pattern

The workflow implements an agentic loop:

1. **LLM Turn** (`ready` -> `prompt_executed`) -- The LLM processes messages and may request tool calls
2. **Execute Tool Calls** (`prompt_executed` -> `awaiting_tools`) -- If `message.stopReason === 'tool_use'`, delegate tool execution
3. **Tools Complete** (`awaiting_tools` -> `ready`) -- When all tools finish, loop back for another LLM turn
4. **Final Response** (`prompt_executed` -> end) -- If no tool calls, save the final response

```typescript
@Transition({ from: 'prompt_executed', to: 'end' })
async respond(state: ToolCallState): Promise<unknown> {
  await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
    meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
  });
  return {};
}
```

This pattern allows the LLM to make multiple tool calls before providing a final response.

### Workflow Class

The complete workflow class:

```typescript
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import { LlmDelegateToolCallsTool, LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { GetWeather } from './tools/get-weather.tool';

interface ToolCallState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  title: 'LLM Tool Calling Example (Berlin Weather)',
  description: 'An example workflow that demonstrates how to use an LLM to call external tools.',
})
export class ToolCallWorkflow extends BaseWorkflow<Record<string, unknown>, ToolCallState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly getWeather: GetWeather,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: ToolCallState): Promise<ToolCallState> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', content: 'How is the weather in Berlin?' });
    return state;
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: ToolCallState): Promise<ToolCallState> {
    const result = await this.llmGenerateText.call(
      {},
      { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
    );
    return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: ToolCallState): Promise<ToolCallState> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
    });
    return { ...state, delegateResult: result.data };
  }

  hasToolCalls(state: ToolCallState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async toolsComplete(state: ToolCallState): Promise<ToolCallState> {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      content: state.delegateResult!.toolResults.map((tr) => ({
        type: 'tool_result' as const,
        toolCallId: tr.toolCallId,
        content: tr.content ?? '',
        isError: tr.isError ?? false,
      })),
    });
    return state;
  }

  allToolsComplete(state: ToolCallState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: ToolCallState): Promise<unknown> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return {};
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework functionality, `BaseWorkflow`, `BaseTool`, decorators
- `@loopstack/llm-provider-module` - Provides `LlmGenerateTextTool`, `LlmDelegateToolCallsTool` tools, `LlmMessageDocument`, and result types

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
