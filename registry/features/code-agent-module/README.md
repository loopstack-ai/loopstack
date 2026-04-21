# @loopstack/code-agent

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

AI-powered code exploration for Loopstack workflows. Bundles a sub-agent workflow that searches, reads, and synthesises findings from a remote workspace, plus a tool that lets any parent workflow delegate exploration as a single call.

## Overview

The Code Agent module is the go-to primitive when a workflow needs to "figure something out" about a codebase before acting — for example, locating a function, summarising a feature, or answering a free-form question about existing code. The sub-agent runs its own plan-then-tool-call loop against `glob`, `grep`, and `read` from `@loopstack/remote-client`, and returns a plain-text response.

By using this module you'll get:

- `ExploreAgentWorkflow` — a self-contained Claude-powered agent that iteratively explores a remote workspace and returns a synthesised answer
- `ExploreTask` — a tool that launches `ExploreAgentWorkflow` as a sub-workflow, so a parent workflow can delegate exploration with one call

## Installation

```sh
npm install @loopstack/code-agent
```

Register the module in your application:

```ts
import { CodeAgentModule } from '@loopstack/code-agent';

@Module({
  imports: [CodeAgentModule /* ... */],
})
export class AppModule {}
```

`CodeAgentModule` depends on `ClaudeModule`, `LoopCoreModule`, and `RemoteClientModule` — make sure those are configured in your app (typically done in the project scaffold).

## How It Works

### Using `ExploreTask` from a parent workflow

Inject the tool with `@InjectTool()` and call it with a natural-language instruction. The tool returns the `workflowId` of the launched sub-agent and resolves with the synthesised text response when the sub-agent completes:

```ts
import { ExploreTask } from '@loopstack/code-agent';
import { BaseWorkflow, InjectTool, Transition, Workflow } from '@loopstack/common';

@Workflow({ uiConfig: __dirname + '/my.ui.yaml' })
export class MyWorkflow extends BaseWorkflow {
  @InjectTool() explore: ExploreTask;

  @Transition({ from: 'ready', to: 'done' })
  async investigate() {
    const result = await this.explore.call({
      instructions: 'Find the NestJS module where user authentication is wired up.',
    });
    // result.data.response contains the agent's summary
  }
}
```

### What the sub-agent does

`ExploreAgentWorkflow` runs a Claude model with three tools exposed: `glob`, `grep`, and `read`. On each turn it either calls a tool (and transitions to `awaiting_tools`) or produces a final answer (`@Final`). The agent's system prompt instructs it to prefer `grep` over reading whole files — see `src/workflows/explore-agent.workflow.ts` for the prompt.

### Running the workflow directly

You can also run `ExploreAgentWorkflow` standalone without going through the tool:

```ts
import { ExploreAgentWorkflow } from '@loopstack/code-agent';

// Inject and call .run({ instructions: '...' }) from any service or workflow.
```

## Public API

- **Workflow:** `ExploreAgentWorkflow`
- **Tool:** `ExploreTask`
- **Module:** `CodeAgentModule`

## Dependencies

- `@loopstack/common` — core decorators and `BaseTool` / `BaseWorkflow`
- `@loopstack/core` — `LoopCoreModule`
- `@loopstack/claude-module` — `ClaudeGenerateText`, `DelegateToolCalls`, `ClaudeMessageDocument`
- `@loopstack/remote-client` — `GlobTool`, `GrepTool`, `ReadTool` (executed on the remote workspace)

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- Find more Loopstack modules in the [Loopstack Registry](https://loopstack.ai/registry)
