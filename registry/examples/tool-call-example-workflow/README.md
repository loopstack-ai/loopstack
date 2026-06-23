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
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

@Tool({
  description: 'Retrieve weather information.',
  schema: z.object({ location: z.string() }),
})
export class GetWeather extends BaseTool<{ location: string }, object, string> {
  protected async handle(): Promise<ToolEnvelope<string>> {
    return Promise.resolve({
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.',
    });
  }
}
```

The `description` is passed to the LLM to help it understand when to use the tool.

#### 2. Injecting Tools in the Workflow

Tools are injected via standard NestJS constructor injection:

```typescript
@Workflow({ ... })
export class ToolCallWorkflow extends BaseWorkflow {
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
async llmTurn(state: ToolCallState) {
  const result = await this.llmGenerateText.call(
    {},
    { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
  );
  this.assignState({ llmResult: result.data });
}
```

The `provider`, `model`, `tools`, and other config fields are passed via `{ config: { ... } }` at call time. The result is stored in the state object for use in routing and subsequent transitions. The assistant message is persisted to the document store automatically — pass `config: { save: false }` if you want to handle persistence yourself.

#### 4. Guard-Based Conditional Routing

Use the `@Guard` decorator to conditionally enable transitions. Guards reference methods on the workflow class that return a boolean. From `prompt_executed`, the workflow either loops back for another LLM turn (if tools were requested) or ends:

```typescript
@Transition({ from: 'prompt_executed', to: 'ready', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: ToolCallState) {
  await this.llmDelegateToolCalls.call({ message: state.llmResult!.message });
}

hasToolCalls(state: ToolCallState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}

@Transition({ from: 'prompt_executed', to: 'end' })
respond(_state: ToolCallState) {
}
```

The `priority: 10` ensures `executeToolCalls` is evaluated before `respond` when both could match.

#### 5. Delegating Tool Execution

`LlmDelegateToolCallsTool` runs the tool calls from the LLM response message and persists the resulting `tool_result` user-role message automatically — the next LLM turn sees it as conversation history:

```typescript
await this.llmDelegateToolCalls.call({ message: state.llmResult!.message });
```

#### 6. Agentic Loop Pattern

The workflow implements an agentic loop:

1. **LLM Turn** (`ready` → `prompt_executed`) — the LLM processes messages and may request tool calls.
2. **Execute Tool Calls** (`prompt_executed` → `ready`, guarded by `hasToolCalls`) — if `message.stopReason === 'tool_use'`, delegate runs the tools and loops back for another LLM turn.
3. **Final Response** (`prompt_executed` → `end`) — if no tool calls, the workflow finishes.

This pattern lets the LLM make multiple tool calls before producing a final response. For tools that complete asynchronously (sub-workflows, HITL pauses), pass `callback: { transition: '...' }` to `llmDelegateToolCalls.call` and add an intermediate `awaiting_tools` state with a `wait: true` re-entry transition — see [@loopstack/agent](https://loopstack.ai/registry/loopstack-agent) for the full async pattern.

### Workflow Class

The complete workflow class:

```typescript
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import { LlmDelegateToolCallsTool, LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { GetWeather } from './tools/get-weather.tool';

interface ToolCallState {
  llmResult?: LlmGenerateTextResult;
}

@Workflow({
  title: 'LLM Tool Calling Example (Berlin Weather)',
  description: 'An example workflow that demonstrates how to use an LLM to call external tools.',
})
export class ToolCallWorkflow extends BaseWorkflow {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly getWeather: GetWeather,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: ToolCallState) {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: 'How is the weather in Berlin?' });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: ToolCallState) {
    const result = await this.llmGenerateText.call(
      {},
      { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
    );
    this.assignState({ llmResult: result.data });
  }

  @Transition({ from: 'prompt_executed', to: 'ready', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: ToolCallState) {
    await this.llmDelegateToolCalls.call({ message: state.llmResult!.message });
  }

  hasToolCalls(state: ToolCallState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  respond(_state: ToolCallState) {}
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
