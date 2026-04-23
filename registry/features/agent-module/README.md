# @loopstack/agent

A generic, reusable LLM agent workflow for Loopstack. Runs a standard agent loop (LLM → tool calls → loop) configured entirely via `run()` args. No subclassing required.

## Installation

```bash
loopstack add @loopstack/agent
```

## Quick Start

Register tools on your workspace so they're available to all workflows:

```typescript
import { Workspace, InjectTool, InjectWorkflow } from '@loopstack/common';
import { GlobTool, GrepTool, ReadTool } from '@loopstack/remote-client';
import { AgentWorkflow } from '@loopstack/agent';

@Workspace({ ... })
export class MyWorkspace {
  @InjectWorkflow() agent: AgentWorkflow;

  @InjectTool() glob: GlobTool;
  @InjectTool() grep: GrepTool;
  @InjectTool() read: ReadTool;
}
```

Launch the agent from any workflow:

```typescript
const result = await this.agent.run(
  {
    system: 'You are a code exploration agent. When done, summarize your findings in your final message.',
    tools: ['glob', 'grep', 'read'],
    userMessage: 'Find all API endpoints in the codebase.',
  },
  { alias: 'agent', callback: { transition: 'agentDone' } },
);
```

## How the Agent Workflow Works

The agent runs a closed-loop LLM agent cycle:

```
setup → ready → llmTurn → prompt_executed
                               ├── [has tool calls] → executeToolCalls → awaiting_tools
                               │                          ├── [callback] → toolResultReceived (loop)
                               │                          ├── [all complete] → toolsComplete → ready (loop)
                               │                          └── [cancel button] → cancelPendingTools → ready
                               └── [end_turn] → respond → end (returns final message)
```

1. **Setup**: saves the `userMessage` as the first conversation message.
2. **LLM turn**: calls Claude with the `system` prompt and `tools` list.
3. **Tool execution**: if the LLM requests tool calls, `DelegateToolCalls` executes them. For async tools (sub-workflows), callbacks are handled via `UpdateToolResult`.
4. **Loop**: after tools complete, loops back to the LLM for the next turn.
5. **Completion**: when the LLM responds without tool calls (`end_turn`), the agent exits and returns the final message text as its result.

## Args

| Arg           | Type       | Required | Description                                                            |
| ------------- | ---------- | -------- | ---------------------------------------------------------------------- |
| `system`      | `string`   | yes      | System prompt for the LLM                                              |
| `tools`       | `string[]` | yes      | Tool property names available to the LLM                               |
| `userMessage` | `string`   | yes      | Initial user message to start the conversation                         |
| `context`     | `string`   | no       | Hidden context message saved before userMessage (e.g. pre-loaded docs) |
| `model`       | `string`   | no       | Claude model (default: `claude-sonnet-4-6`)                            |
| `cache`       | `boolean`  | no       | Enable prompt caching (default: `true`)                                |

## Tool Resolution

Tools are resolved by property name in this order:

1. **Workflow** — tools declared via `@InjectTool()` on the current workflow
2. **Workspace** — tools declared via `@InjectTool()` on the workspace

The agent workflow itself only injects `ClaudeGenerateText`, `DelegateToolCalls`, and `UpdateToolResult`. Domain-specific tools (e.g. `glob`, `grep`, `read`) are resolved from the workspace at runtime.

This means you declare tools once on the workspace and they're automatically available to the agent and all other workflows.

## Cancel Pending Tools

If the agent is stuck at `awaiting_tools` (e.g. a sub-workflow hasn't returned), a "Cancel pending tools" button appears in the UI. Clicking it cancels all pending child workflows and returns the agent to the LLM loop.

## Building a Custom Agent

The generic `AgentWorkflow` covers the common case: a closed-loop agent that runs until the LLM decides it's done. For more complex scenarios, copy the workflow and modify it directly:

### Adding user interaction

Add a `waiting_for_user` state so the agent can pause for user input:

```typescript
// Instead of @Final from prompt_executed:
@Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
@Guard('isEndTurn')
async respondToUser() {
  await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
}

@Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
async userMessage(payload: string) {
  await this.repository.save(ClaudeMessageDocument, { role: 'user', content: payload });
}
```

### Adding a custom exit condition

Exit the loop when a specific tool is called (e.g. a "submit result" tool):

```typescript
@Final({ from: 'awaiting_tools', priority: 20 })
@Guard('hasSubmittedResult')
async agentDone() {
  return { result: this.extractSubmittedResult() };
}

@Transition({ from: 'awaiting_tools', to: 'ready' })
@Guard('allToolsCompleteNotSubmitted')
async toolsComplete() {}
```

### Adding setup steps

Load context documents or run preparation before the agent loop:

```typescript
@Initial({ to: 'docs_loaded' })
async loadContext(args: { instructions: string }) {
  const docs = await this.loadFiles.call({ files: ['context.md'] });
  this.contextDocs = docs.data;
}

@Transition({ from: 'docs_loaded', to: 'ready' })
async setupPrompt() {
  await this.repository.save(ClaudeMessageDocument, {
    role: 'user',
    content: this.render(__dirname + '/templates/context.md', { docs: this.contextDocs }),
  }, { meta: { hidden: true } });
}
```

## Module Setup

Import `AgentModule` in your application module:

```typescript
import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';

@Module({
  imports: [AgentModule],
})
export class AppModule {}
```
