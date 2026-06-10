---
title: Agent Module
description: Generic LLM agent workflows for Loopstack — AgentWorkflow (single-run tool loop), ChatAgentWorkflow (multi-turn chat with optional task mode), AgentFinishTool, tool resolution via NestJS DI, configurable system prompt and tool set
---

# @loopstack/agent

> Agent workflow module for the [Loopstack](https://loopstack.ai) automation framework.

Generic, reusable LLM agent workflows for Loopstack. Run a standard agent loop (LLM → tool calls → loop) configured entirely via `run()` args — no subclassing required.

## When to Use

- **You need an autonomous agent** that calls tools in a loop until it's done — use `AgentWorkflow`.
- **You need a multi-turn chat agent** where the user can send messages between LLM turns — use `ChatAgentWorkflow`.
- **You want task-mode chat** where the agent can explicitly finish and return a structured result — use `ChatAgentWorkflow` with `taskMode: true`.
- **You need a custom agent loop** with domain-specific exit conditions, extra setup steps, or user interaction mid-loop — build your own workflow using `LlmGenerateTextTool` and `LlmDelegateToolCallsTool` directly (see [Building a Custom Agent](https://loopstack.ai/docs/build/ai/agent-workflows#building-a-custom-agent)).

## Installation

```bash
npm install @loopstack/agent
```

Register the module and your tools:

```typescript
import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { ClaudeModule } from '@loopstack/claude-module';
import { MyWorkflow } from './my.workflow';
import { SearchTool } from './tools/search.tool';
import { SummarizeTool } from './tools/summarize.tool';

@Module({
  imports: [ClaudeModule, AgentModule],
  providers: [MyWorkflow, SearchTool, SummarizeTool],
  exports: [MyWorkflow],
})
export class MyModule {}
```

Tools registered as providers in the module are automatically available to the agent at runtime — resolved by their `@Tool({ name })` value.

## Quick Start

Launch an agent from any workflow:

```typescript
import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, CallbackSchema, LinkDocument, MessageDocument, Transition, Workflow } from '@loopstack/common';

const AgentCallbackSchema = CallbackSchema.extend({
  data: z.object({ response: z.string() }),
});

type AgentCallback = z.infer<typeof AgentCallbackSchema>;

@Workflow({ title: 'My Workflow' })
export class MyWorkflow extends BaseWorkflow {
  constructor(private readonly agent: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.agent.run(
      {
        system: 'You are a helpful assistant with access to search and summarize tools.',
        tools: ['search', 'summarize'],
        userMessage: 'Find and summarize the latest news about AI.',
      },
      { callback: { transition: 'agentDone' } },
    );

    await this.documentStore.save(
      LinkDocument,
      { label: 'Agent working...', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Transition({ from: 'running', to: 'end', wait: true, schema: AgentCallbackSchema })
  async agentDone(state: Record<string, unknown>, payload: AgentCallback): Promise<unknown> {
    await this.documentStore.save(
      LinkDocument,
      { label: 'Agent complete', status: 'success', workflowId: payload.workflowId },
      { id: `link_${payload.workflowId}` },
    );
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: payload.data.response,
    });
    return {};
  }
}
```

The agent loops autonomously until the LLM responds without tool calls, then returns `{ response: string }` via the callback.

## How It Works

### AgentWorkflow

Runs a closed-loop LLM agent cycle:

```
setup → ready → llmTurn → prompt_executed
                               ├── [has tool calls] → executeToolCalls → awaiting_tools
                               │                          ├── [callback] → toolResultReceived (loop)
                               │                          ├── [all complete] → toolsComplete → ready (loop)
                               │                          └── [cancel button] → cancelPendingTools → ready
                               └── [end_turn] → respond → end (returns final message)
```

1. **Setup** — saves the `userMessage` (and optional `context`) as conversation messages.
2. **LLM turn** — calls the LLM with the `system` prompt and resolved `tools`.
3. **Tool execution** — if the LLM requests tool calls, `LlmDelegateToolCallsTool` executes them. For async tools (sub-workflows), callbacks loop through `toolResultReceived`.
4. **Loop** — after all tools complete, loops back to the LLM for the next turn.
5. **Completion** — when the LLM responds without tool calls (`end_turn`), the agent exits and returns `{ response: string }`.

### ChatAgentWorkflow

Extends the agent loop with multi-turn user interaction:

```
setup → ready → llmTurn → prompt_executed
                               ├── [has tool calls] → executeToolCalls → awaiting_tools
                               │                          ├── [finished] → end (returns finish result)
                               │                          ├── [callback] → toolResultReceived (loop)
                               │                          ├── [all complete] → toolsComplete → ready (loop)
                               │                          └── [cancel button] → cancelPendingTools → ready
                               └── [end_turn] → respond → waiting_for_user
                                                               └── userMessage → ready (loop)
```

Instead of exiting on `end_turn`, the agent pauses at `waiting_for_user`. The user sends a message via the Studio UI, and the agent loops back.

With `taskMode: true`, `AgentFinishTool` is added to the tool set. When the LLM calls it, the agent exits immediately and returns the finish result.

```typescript
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, LinkDocument, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

@Workflow({
  title: 'Chat Assistant',
  description: 'Interactive chat agent connected to Linear via MCP.',
})
export class MyChatWorkflow extends BaseWorkflow {
  constructor(private readonly chatAgent: ChatAgentWorkflow) {
    super();
  }

  @Transition({ to: 'chatting' })
  async startChat(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.chatAgent.run({
      system: 'You are a helpful assistant.',
      tools: ['mcp_list_tools', 'mcp_call'],
      userMessage: 'What tools are available?',
    });

    await this.documentStore.save(LinkDocument, {
      workflowId: result.workflowId,
      label: 'Chat Agent',
      embed: true,
      expanded: true,
    });
    return state;
  }
}
```

Note that `ChatAgentWorkflow.run()` does not need a callback — the chat agent stays running until the user is done (or until `agent_finish` is called in task mode).

### Tool Resolution

Tools are resolved by their `@Tool({ name })` value from the NestJS dependency injection container at runtime.

The agent workflows only inject their own internal tools (`LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`). Domain-specific tools (e.g. `search`, `glob`, `read`) are resolved from the module's providers when the LLM calls them.

Register tools once in your module and they're available to the agent and all other workflows:

```typescript
@Module({
  imports: [AgentModule],
  providers: [MyWorkflow, SearchTool, GlobTool, GrepTool],
})
export class MyModule {}
```

### Cancel Pending Tools

If the agent is stuck at `awaiting_tools` (e.g. a sub-workflow hasn't returned), a "Cancel pending tools" button appears in the Studio UI. Clicking it cancels all pending child workflows and returns the agent to the LLM loop.

## Args Reference

### AgentWorkflow

| Arg           | Type       | Required | Description                                                              |
| ------------- | ---------- | -------- | ------------------------------------------------------------------------ |
| `system`      | `string`   | yes      | System prompt for the LLM                                                |
| `tools`       | `string[]` | yes      | Tool names available to the LLM (matched by `@Tool({ name })`)           |
| `userMessage` | `string`   | yes      | Initial user message to start the conversation                           |
| `context`     | `string`   | no       | Hidden context message saved before `userMessage` (e.g. pre-loaded docs) |

**Returns:** `{ response: string }` — the final LLM text response

### ChatAgentWorkflow

| Arg           | Type       | Required | Description                                                                        |
| ------------- | ---------- | -------- | ---------------------------------------------------------------------------------- |
| `system`      | `string`   | yes      | System prompt for the LLM                                                          |
| `tools`       | `string[]` | yes      | Tool names available to the LLM                                                    |
| `userMessage` | `string`   | yes      | Initial user message to start the conversation                                     |
| `context`     | `string`   | no       | Hidden context message saved before `userMessage`                                  |
| `taskMode`    | `boolean`  | no       | When `true`, adds `AgentFinishTool` so the agent can exit with a structured result |

**Returns (task mode):** the result passed to `AgentFinishTool`

## Tools Reference

### AgentFinishTool

Used internally by `ChatAgentWorkflow` in task mode. The LLM calls this tool when it has completed its task.

| Property        | Value                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------- |
| **Name**        | `agent_finish`                                                                            |
| **Description** | Call this tool when you have completed the task and are ready to return the final result. |

| Arg      | Type      | Required | Description                               |
| -------- | --------- | -------- | ----------------------------------------- |
| `result` | `unknown` | no       | The final result to return from the agent |

You don't call this tool directly — it's added to the LLM's tool set automatically when `taskMode: true`.

## Configuration

### LLM Provider

By default, `AgentModule` uses whatever LLM provider is configured in your app. To configure a specific provider:

```typescript
import { AgentModule } from '@loopstack/agent';

@Module({
  imports: [
    AgentModule.forFeature({
      llm: { provider: 'claude', model: 'claude-sonnet-4-5' },
    }),
  ],
  providers: [MyWorkflow],
})
export class MyModule {}
```

## Public API

- **Module:** `AgentModule` (with `forFeature()` for LLM config)
- **Workflows:** `AgentWorkflow`, `ChatAgentWorkflow`
- **Tools:** `AgentFinishTool`
- **Types:** `AgentRunResult`

## Dependencies

- `@loopstack/common` — `BaseWorkflow`, `BaseTool`, decorators
- `@loopstack/core` — `LoopCoreModule`, `WorkflowOrchestrator`
- `@loopstack/llm-provider-module` — `LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`, `LlmMessageDocument`

## Related

- [Agent Workflows](https://loopstack.ai/docs/build/ai/agent-workflows) — conceptual guide with custom agent loop examples
- [AI Tool Calling](https://loopstack.ai/docs/build/ai/tool-calling) — how LLMs invoke workflow tools via function calling
- [Tutorial: Chat Agent with Tools](https://loopstack.ai/docs/tutorials/chat-agent-with-tools) — step-by-step tutorial building a chat agent from scratch
- [Creating Tools](https://loopstack.ai/docs/build/fundamentals/tools) — defining custom tools the agent can call
- [@loopstack/code-agent](https://loopstack.ai/docs/registry/features/code-agent-module) — code exploration agent built on `AgentWorkflow`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
