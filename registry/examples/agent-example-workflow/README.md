---
title: Agent Example
description: Example launching AgentWorkflow as a sub-workflow with custom tools (weather_lookup, calculator) and rendering progress in Studio
---

# @loopstack/agent-example-workflow

Demonstrates how to launch `AgentWorkflow` from [`@loopstack/agent`](https://loopstack.ai/docs/registry/features/agent-module) as a sub-workflow with custom tools (`weather_lookup`, `calculator`) and render progress/results in Studio.

## By using this example you'll get...

- A parent workflow that queues `AgentWorkflow` via `WORKFLOW_ORCHESTRATOR`
- The child agent rendered inline in the parent's view via `show: 'inline'`
- A callback transition that stores the final agent response as a `MessageDocument`

## Installation

```sh
npm install @loopstack/agent-example-workflow
```

`@loopstack/agent` requires an LLM provider configuration. Use `AgentExampleModule.forFeature({ llm: ... })` when you want to override provider config per module.

Then register the module in your app:

```typescript
import { AgentExampleModule, AgentExampleWorkflow } from '@loopstack/agent-example-workflow';
import { StudioApp } from '@loopstack/common';

@StudioApp({
  title: 'Agent Example',
  workflows: [AgentExampleWorkflow],
})
@Module({
  imports: [AgentExampleModule],
})
export class MyAppModule {}
```

## How It Works

1. `start` queues `AgentWorkflow` with a system prompt and selected tools, with `show: 'inline'` so the child is embedded in the parent's run view.
2. When the child workflow finishes, `agentComplete` receives the callback payload data.
3. The workflow saves the final assistant message.

## Public API

- `AgentExampleModule`
- `AgentExampleWorkflow`
- `CalculatorTool`
- `WeatherLookupTool`

## Dependencies

- `@loopstack/common`
- `@loopstack/agent`
