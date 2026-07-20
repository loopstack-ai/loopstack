---
title: Code Agent Module
description: AI-powered codebase exploration for Loopstack — ExploreTask tool launches AgentWorkflow sub-agent with glob/grep/read tools, CodeAgentModule registration, forFeature() LLM config, TransitionInput envelope for sub-workflow completion
---

# @loopstack/code-agent

> Agent workflow module for the [Loopstack](https://loopstack.ai) automation framework.

AI-powered code exploration for Loopstack workflows. Provides a tool that launches a sub-agent workflow to search, read, and synthesize findings from a remote workspace using `glob`, `grep`, and `read` tools from `@loopstack/remote-client`.

## When to Use

- You need a workflow to **answer questions about a codebase** before acting — locating functions, summarizing features, understanding architecture
- You want to **delegate exploration as a single tool call** from a parent workflow or agent
- You need a self-contained agent that **iteratively searches and reads files** on a remote workspace and returns a synthesized answer
- Use `@loopstack/remote-client` directly if you only need individual file operations without the agent loop

## Installation

```sh
npm install @loopstack/code-agent
```

Register the module in your application:

```ts
import { Module } from '@nestjs/common';
import { CodeAgentModule } from '@loopstack/code-agent';

@Module({
  imports: [CodeAgentModule],
})
export class AppModule {}
```

`CodeAgentModule` imports `AgentModule` from `@loopstack/agent`, which in turn requires `LlmProviderModule` and `RemoteClientModule` to be configured in your app.

To override the LLM provider or model for this module specifically:

```ts
@Module({
  imports: [CodeAgentModule.forFeature({ llm: { provider: 'claude', model: 'claude-sonnet-4-20250514' } })],
})
export class AppModule {}
```

## Quick Start

The most common pattern is launching the code agent from a parent workflow using `AgentWorkflow` directly:

```ts
import { Module } from '@nestjs/common';
import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import { CodeAgentModule } from '@loopstack/code-agent';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';

const ExploreResponseSchema = z.object({ response: z.string() });

@Workflow({ title: 'Code Agent Example' })
export class MyWorkflow extends BaseWorkflow {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'exploring' })
  async start(state: Record<string, unknown>) {
    await this.agentWorkflow.run(
      {
        system: 'You are a codebase exploration agent. Search and read source code to answer the question thoroughly.',
        tools: ['glob', 'grep', 'read'],
        userMessage: 'Find the entry-point module and list its top-level providers.',
      },
      { callback: { transition: 'onExploreComplete' }, show: 'inline', label: 'Exploring codebase...' },
    );
  }

  @Transition({ from: 'exploring', to: 'end', wait: true, schema: ExploreResponseSchema })
  async onExploreComplete(state: Record<string, unknown>, input: TransitionInput<{ response: string }>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: input.data.response,
    });
  }
}

@Module({
  imports: [CodeAgentModule],
  providers: [MyWorkflow],
  exports: [MyWorkflow, CodeAgentModule],
})
export class MyModule {}
```

## How It Works

### State Machine

```
start ──► exploring (wait) ──► end
             │                   ▲
             └── callback ───────┘
```

1. The parent workflow calls `agentWorkflow.run()` with a system prompt, tool list, and user message
2. The `AgentWorkflow` sub-workflow starts its own agent loop: LLM generates text, calls tools (`glob`, `grep`, `read`), loops until it produces a final answer
3. The orchestrator renders the sub-workflow inline in the parent's UI based on the `show` option (`'inline'` by default)
4. When the agent finishes, it calls back to the parent workflow's wait transition with `{ data: { response } }`
5. The parent receives the synthesized answer and can display it or act on it

### ExploreTask Tool

The module also provides `ExploreTask`, a tool wrapper around `AgentWorkflow` that can be used by other agents:

```
Parent Agent ──► explore_task tool call ──► AgentWorkflow sub-agent
                                                  │
                                            glob/grep/read loop
                                                  │
                                            synthesized answer
                                                  │
                                           ◄── complete() callback
```

`ExploreTask` launches the sub-agent and returns `{ workflowId }` with `pending` status. The orchestrator renders the sub-agent inline in the parent's view. When the sub-agent completes, `ExploreTask.complete()` returns the response text.

## Args Reference

### AgentWorkflow.run()

| Arg           | Type       | Required | Description                                                    |
| ------------- | ---------- | -------- | -------------------------------------------------------------- |
| `system`      | `string`   | Yes      | System prompt for the agent                                    |
| `tools`       | `string[]` | Yes      | Tool names to make available (e.g. `['glob', 'grep', 'read']`) |
| `userMessage` | `string`   | Yes      | The question or instruction for the agent                      |
| `context`     | `string`   | No       | Additional context to include in the conversation              |

Second argument (options):

| Arg                   | Type     | Required | Description                                     |
| --------------------- | -------- | -------- | ----------------------------------------------- |
| `callback.transition` | `string` | No       | Transition name to call when the agent finishes |

**Returns:** `QueueResult` with `{ workflowId: string }`

### Callback Envelope

The parent's wait transition receives a `TransitionInput<TData>`. Pass only the `data` shape as the schema — the framework wraps it:

```ts
const ExploreResponseSchema = z.object({ response: z.string() });
// Receiver: input: TransitionInput<{ response: string }>
```

| Field                 | Type             | Description                                               |
| --------------------- | ---------------- | --------------------------------------------------------- |
| `input.workflowId`    | `string`         | ID of the completed sub-workflow                          |
| `input.status`        | enum             | `'completed'` / `'failed'` / `'canceled'`                 |
| `input.hasError`      | `boolean`        | Whether the sub-agent terminated in failure               |
| `input.errorMessage`  | `string \| null` | Error description when `hasError`                         |
| `input.data.response` | `string`         | The agent's synthesized text answer (validated by schema) |

## Tools Reference

### explore_task

| Field           | Value                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**        | `explore_task`                                                                                                                                                               |
| **Description** | Launch a sub-agent to explore and analyze the codebase. The agent uses glob, grep, and read tools to search for files and code patterns, then returns a synthesized summary. |

**Args (Zod schema):**

| Arg            | Type     | Required | Description                                               |
| -------------- | -------- | -------- | --------------------------------------------------------- |
| `instructions` | `string` | Yes      | Detailed instructions for what to explore in the codebase |

**Returns:** `ToolEnvelope<ExploreTaskResult>`

- On launch: `{ data: { workflowId }, pending: { workflowId } }`
- On complete: `{ data: string }` — the agent's synthesized response text

## Configuration

### CodeAgentModule.forFeature()

Override the LLM provider or model for the code agent specifically:

```ts
CodeAgentModule.forFeature({
  llm: {
    provider: 'claude', // LLM provider name
    model: 'claude-sonnet-4-20250514', // Model identifier
  },
});
```

| Option         | Type     | Required | Description       |
| -------------- | -------- | -------- | ----------------- |
| `llm.provider` | `string` | No       | LLM provider name |
| `llm.model`    | `string` | No       | Model identifier  |

## Public API

- **Module:** `CodeAgentModule`
- **Tool:** `ExploreTask`
- **Type:** `ExploreTaskResult`

## Dependencies

| Package                    | Role                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `@loopstack/agent`         | `AgentWorkflow` — generic LLM agent loop with tool calling    |
| `@loopstack/common`        | `BaseTool`, `BaseWorkflow`, decorators, document types        |
| `@loopstack/core`          | Workflow engine, scheduling, state management                 |
| `@loopstack/remote-client` | `glob`, `grep`, `read` tools executed on the remote workspace |
| `@nestjs/common`           | NestJS dependency injection                                   |
| `zod`                      | Schema validation                                             |

## Related

- [`code-agent-example-workflow`](https://loopstack.ai/docs/registry/examples/code-agent-example-workflow) — full working example showing `AgentWorkflow` with glob/grep/read
- [Agent Workflows](https://loopstack.ai/docs/build/ai/agent-workflows) — how the agent loop, tool resolution, and callbacks work
- [`@loopstack/agent`](https://loopstack.ai/docs/registry/features/agent-module) — the generic `AgentWorkflow` that powers the code agent
- [`@loopstack/remote-client`](https://loopstack.ai/docs/registry/features/remote-client-module) — the `glob`, `grep`, and `read` tools used by the agent

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
