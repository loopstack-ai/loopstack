---
title: Agent Examples
description: Workflow examples for LLM agents in Loopstack — basic AgentWorkflow with custom tools, code-exploration agent, MCP-connected agent, and a from-scratch custom agent loop with error handling.
---

# @loopstack/agent-examples

> LLM agent workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Four ways to build agents in Loopstack — from the recommended `AgentWorkflow` shortcut to a from-scratch custom loop. Pick the right shape for your control vs. simplicity tradeoff.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/agent-examples src/agent-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AgentExamplesModule } from './agent-examples/agent-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), AgentExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/agent-examples
```

```typescript
import { AgentExamplesModule } from '@loopstack/agent-examples';
```

## Required app-module configuration

All four examples use LLM tools (`LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, etc.) from `@loopstack/llm-provider-module`. That module is `@Global` and must be configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { AgentExamplesModule } from '@loopstack/agent-examples';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { LoopstackModule } from '@loopstack/loopstack-module';

@Module({
  imports: [LoopstackModule.forRoot(), LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }), AgentExamplesModule],
})
export class AppModule {}
```

`AgentExamplesModule` re-imports `ClaudeModule` (provider), `AgentModule` (the `AgentWorkflow` / `ChatAgentWorkflow` classes), `CodeAgentModule`, `McpModule`, and `RemoteClientModule.forFeature({ type: 'sandbox' })`. `LlmProviderModule.forRoot(...)` sets the default model the tools dispatch to.

The Code Agent example additionally requires `RemoteClientModule.forRoot({ environments })` — see [Code Agent → Setup](#code-agent) below.

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
LINEAR_MCP_TOKEN=...   # required only for the MCP Linear example
```

## Examples

| Example                       | Studio title                   | Description                                                                          |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| [Agent](#agent)               | `Agent - Basic Agent Example`  | Launch `AgentWorkflow` with custom tools — recommended starting point                |
| [Code Agent](#code-agent)     | `Agent - Code Agent Example`   | Specialized codebase-exploration agent with `glob` / `grep` / `read`                 |
| [MCP Linear](#mcp-linear)     | `Agent - MCP Linear Example`   | Chat agent connected to Linear's hosted MCP server via `mcp_list_tools` + `mcp_call` |
| [Custom Agent](#custom-agent) | `Agent - Custom Agent Example` | Build an agent loop from scratch — delegate primitives, guards, error handling       |

---

## Agent

Launches a generic `AgentWorkflow` as a sub-workflow with two custom tools (`weather_lookup`, `calculator`) and renders the agent's run inline in the parent view. The recommended starting point for agent workflows.

### Files

- `agent-example.workflow.ts` — workflow class
- `tools/weather-lookup.tool.ts`, `tools/calculator.tool.ts` — custom tools
- `templates/system.md` — agent system prompt

## Code Agent

Launches `AgentWorkflow` as a code-exploration agent with `glob`, `grep`, and `read` tools. Demonstrates configuring a domain-specific agent without building a custom loop.

### Setup

The `glob`, `grep`, and `read` tools execute on a **remote agent**, so the workspace must have a `sandbox` environment connected.

**1. Run a remote agent.** The simplest option is `@loopstack/remote-server` on `localhost:3001` (see `services/remote-server/`).

**2. Register an available environment in your app module:**

```typescript
import { RemoteClientModule } from '@loopstack/remote-client';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    RemoteClientModule.forRoot({
      environments: {
        available: [
          {
            type: 'sandbox',
            name: 'Local Remote Server',
            connectionUrl: 'http://localhost:3080',
            agentUrl: 'http://localhost:3001',
            local: true,
          },
        ],
      },
    }),
    AgentExamplesModule,
  ],
})
export class AppModule {}
```

`AgentExamplesModule` itself declares the `sandbox` slot via `RemoteClientModule.forFeature(...)` — make sure you use the same type = sandbox.

**3. Create a workspace from the Studio.** The environment is auto-selected from the matching `type` and persisted on creation.

### Files

- `code-agent-example.workflow.ts` — workflow class

## MCP Linear

Launches `ChatAgentWorkflow` configured with `mcp_list_tools` + `mcp_call`, pointing at Linear's hosted MCP server. The agent dynamically discovers Linear's tool surface at runtime and invokes the right one for the user's question.

Requires `LINEAR_MCP_TOKEN` env var and configures `McpModule.forRoot` with an allowed-hosts policy.

### Files

- `mcp-linear-example.workflow.ts` — workflow class

## Custom Agent

A from-scratch agent loop using the delegate primitives (`LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`). Demonstrates the pattern `AgentWorkflow` encapsulates: LLM call → guard on `tool_use` vs `end_turn` → delegate tools → feed results back → loop.

Also exercises error self-correction: the LLM is instructed to deliberately trigger validation errors (`strictSchema` with wrong args), runtime errors (`runtimeError`), and failed sub-workflows (`failingSubWorkflow`), then observe the `is_error` tool results and correct course.

### When to use

- You need finer control than `AgentWorkflow` provides (custom guards, cancellation logic, telemetry hooks)
- You want to understand what `AgentWorkflow` does under the hood
- You need a custom shape — multiple parallel LLMs, conditional tool sets per turn, etc.

For the simple case, prefer `AgentWorkflow` (see [Basic Agent Example](../agent/README.md)).

### Files

- `custom-agent-example.workflow.ts` — workflow class
- `custom-agent-example.ui.yaml` — Studio widget
- `templates/system.md` — system prompt
- `tools/{strict-schema,runtime-error,failing-sub-workflow}.tool.ts` — error-trigger tools
- `failing-sub.workflow.ts` — sub-workflow that always fails (used by `failing-sub-workflow.tool`)

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
