---
title: Agent Examples
description: Workflow examples for LLM agents in Loopstack — basic AgentWorkflow with custom tools, tool errors fed back to the LLM, code-exploration agent, and a from-scratch custom agent loop with a turn budget.
---

# Agent Examples

> LLM agent workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Three ways to build agents in Loopstack — from the recommended `AgentWorkflow` shortcut to a from-scratch custom loop. Pick the right shape for your control vs. simplicity tradeoff. One more example shows how an agent recovers when its tools fail.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/agent @loopstack/claude @loopstack/code-agent @loopstack/common @loopstack/llm-provider @loopstack/remote-client
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AgentExamplesModule } from './agent/agent-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), AgentExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

All examples use LLM tools (`LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, etc.) from `@loopstack/llm-provider`. That module is `@Global` and must be configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AgentExamplesModule } from './agent/agent-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }), AgentExamplesModule],
})
export class AppModule {}
```

`AgentExamplesModule` re-imports `ClaudeModule` (provider), `AgentModule` (the `AgentWorkflow` / `ChatAgentWorkflow` classes), `CodeAgentModule`, and `RemoteClientModule.forFeature({ type: 'sandbox' })`. `LlmProviderModule.forRoot(...)` sets the default model the tools dispatch to.

The Code Agent example additionally requires `RemoteClientModule.forRoot({ environments })` — see [Code Agent → Setup](#code-agent) below.

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Examples

| Example                       | Studio title                   | Description                                                                         |
| ----------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| [Agent](#agent)               | `Agent - Basic Agent Example`  | Launch `AgentWorkflow` with custom tools — recommended starting point               |
| [Tool Errors](#tool-errors)   | `Agent - Tool Errors Example`  | Failing tools reach the LLM as `is_error` tool results, and the LLM corrects course |
| [Code Agent](#code-agent)     | `Agent - Code Agent Example`   | Specialized codebase-exploration agent with `glob` / `grep` / `read`                |
| [Custom Agent](#custom-agent) | `Agent - Custom Agent Example` | Build an agent loop from scratch — delegate primitives, guards, a turn budget       |

---

## Agent

Launches a generic `AgentWorkflow` as a sub-workflow with two custom tools (`weather_lookup`, `calculator`) and renders the agent's run inline in the parent view. The recommended starting point for agent workflows.

### Files

- `agent-example.workflow.ts` — workflow class
- `tools/weather-lookup.tool.ts`, `tools/calculator.tool.ts` — custom tools
- `templates/system.md` — agent system prompt

## Tool Errors

Launches `AgentWorkflow` with three tools that fail in different ways:

- `strict_schema` — rejects a call whose args do not match its schema
- `runtime_error` — throws when called with `shouldFail: true`
- `failing_sub_workflow` — starts a sub-workflow that always fails

The system prompt tells the LLM to trigger each failure, then make the corrected call. `AgentWorkflow` returns every failure to the LLM as a tool result with `isError: true` instead of failing the run, so the LLM reads the error and corrects course. The example has no error handling of its own: the agent loop does it for every tool.

### Files

- `tool-errors-example.workflow.ts` — workflow class
- `tools/strict-schema.tool.ts`, `tools/runtime-error.tool.ts`, `tools/failing-sub-workflow.tool.ts` — the failing tools
- `tool-errors-failing-sub.workflow.ts` — the sub-workflow that always fails (started by `failing_sub_workflow`)
- `templates/system.md` — agent system prompt with the steps to follow

## Code Agent

Launches `AgentWorkflow` as a code-exploration agent with `glob`, `grep`, and `read` tools. Demonstrates configuring a domain-specific agent without building a custom loop.

### Setup

The `glob`, `grep`, and `read` tools execute on a **remote agent**, so the workspace must have a `sandbox` environment connected.

**1. Run a remote agent.** The simplest option is `@loopstack/remote-server` on `localhost:3001` (see `registry/remote-client/server/`).

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

## Custom Agent

A from-scratch agent loop using the delegate primitives (`LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`). Demonstrates the pattern `AgentWorkflow` encapsulates: LLM call → guard on `tool_use` vs `end_turn` → delegate tools → feed results back → loop.

After two tool-using turns the workflow stops the loop itself and runs one final LLM call with a different system prompt and no tools — a control-flow shape a single `AgentWorkflow.run(...)` cannot express.

### When to use

- You need finer control than `AgentWorkflow` provides (custom guards, cancellation logic, telemetry hooks)
- You want to understand what `AgentWorkflow` does under the hood
- You need a custom shape — multiple parallel LLMs, conditional tool sets per turn, etc.

For the simple case, prefer `AgentWorkflow` (see [Basic Agent Example](#agent)).

### Files

- `custom-agent-example.workflow.ts` — workflow class
- `templates/system.md` — system prompt for the tool-using turns
- `templates/wrap-up.md` — system prompt for the final turn without tools

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
