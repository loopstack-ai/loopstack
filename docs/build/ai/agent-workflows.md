---
title: Agent Workflows
description: Building autonomous LLM agents that call tools in a loop. Covers the built-in AgentWorkflow module, custom agent loops with @Guard routing, error recovery, and max-iterations limits.
---

# Agent Workflows

Build LLM agents that call tools, handle errors, and run as sub-workflows. Use the built-in `AgentWorkflow` for the common case, or build your own loop from scratch with the same decorators.

## Using the Built-In Agent

Install the agent module:

```bash
npm install @loopstack/agent
```

Register tools in your module so the agent can use them:

```typescript
@Module({
  imports: [LlmProviderModule, ClaudeModule, AgentModule],
  providers: [GlobTool, GrepTool, ReadTool, MyWorkflow],
  exports: [MyWorkflow],
})
export class MyModule {}
```

`LlmProviderModule` must be imported alongside any LLM provider module (`ClaudeModule`, `OpenAiModule`) — it registers the global provider registry the adapter tools and provider implementations depend on. See [LLM Providers](./llm-providers.md).

Launch the agent from any workflow:

```typescript
@Transition({ from: 'planning', to: 'implementing' })
async runAgent(state: MyState) {
  await this.agent.run({
    system: 'You are a code exploration agent. Summarize your findings.',
    tools: ['glob', 'grep', 'read'],
    userMessage: 'Find all API endpoints in the codebase.',
  }, { callback: { transition: 'agentDone' } });
}
```

The agent runs a full tool-calling loop automatically: LLM turn → tool execution → loop back → until the LLM responds without tool calls.

### Agent Args

| Arg           | Type       | Required | Description                                   |
| ------------- | ---------- | -------- | --------------------------------------------- |
| `system`      | `string`   | yes      | System prompt                                 |
| `tools`       | `string[]` | yes      | Tool names available to the LLM               |
| `userMessage` | `string`   | yes      | Initial user message                          |
| `context`     | `string`   | no       | Hidden context message (e.g. pre-loaded docs) |

### Pre-Loading Context

Pass documentation or environment data as a hidden context message. The LLM sees it but it's not shown in the UI:

```typescript
const docs = await this.loadFiles.call({
  files: ['docs/api-reference.md', 'docs/architecture.md'],
  basePath: './src/assets',
});

const context = this.render(__dirname + '/templates/context.md', {
  docs: docs.data,
  projectName: args.projectName,
});

await this.agent.run({
  system: 'You are a documentation agent.',
  tools: ['read', 'write', 'glob', 'grep'],
  userMessage: 'Generate API documentation.',
  context,
});
```

## Tool Resolution

When the LLM calls a tool, it's resolved from the NestJS dependency injection container by its `@Tool({ name })` value.

The agent workflow only injects the three tools it always needs (`LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`). Domain-specific tools like `glob` or `read` are resolved from the module at runtime.

This means you register tools once in the module and they're available to the agent and all other workflows.

## Error Handling

Tool errors are handled automatically. When a tool call fails (schema validation or runtime error), the error is returned to the LLM as an `is_error` tool result. The LLM sees the error message and can self-correct on the next turn.

The `LlmDelegateResult` includes error metadata:

```typescript
interface LlmDelegateResult {
  allCompleted: boolean;
  toolResults: { type: 'tool_result'; toolCallId: string; content?: string; isError?: boolean }[];
  pendingCount: number;
  hasErrors: boolean;
  errorCount: number;
  errors: { toolName: string; toolCallId: string; message: string }[];
}
```

## Canceling Pending Tools

If the agent is stuck at `awaiting_tools` (e.g. a sub-workflow hasn't returned), a "Cancel pending tools" button appears in the UI. This cancels all pending child workflows recursively and returns the agent to the LLM loop.

## Building a Custom Agent

The built-in `AgentWorkflow` is a regular workflow. When you need custom behavior, copy it and modify directly. Here's the full loop:

```typescript
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';

interface AgentState {
  llmResult?: LlmGenerateTextResult;
  delegateResult?: LlmDelegateResult;
}

const MyAgentSchema = z.object({ instructions: z.string() });
type MyAgentArgs = z.infer<typeof MyAgentSchema>;

@Workflow({
  widget: __dirname + '/my-agent.ui.yaml',
  schema: MyAgentSchema,
})
export class MyAgentWorkflow extends BaseWorkflow<MyAgentArgs> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    private readonly myCustomTool: MyCustomTool,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: AgentState, ctx: RunContext<MyAgentArgs>) {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      text: ctx.args.instructions,
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: AgentState) {
    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          model: 'claude-sonnet-4-6',
          system: 'You are a custom agent.',
          tools: ['my_custom_tool'],
        },
      },
    );
    this.assignState({ llmResult: result.data });
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: AgentState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived(state: AgentState, input: TransitionInput) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: input,
    });
    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  toolsComplete(state: AgentState) {}

  @Transition({ from: 'prompt_executed', to: 'end' })
  @Guard('isEndTurn')
  respond(_state: AgentState) {}

  private hasToolCalls(state: AgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  private allToolsComplete(state: AgentState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  private isEndTurn(state: AgentState): boolean {
    return state.llmResult?.message.stopReason === 'end_turn';
  }
}
```

`LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, and `LlmUpdateToolResultTool` all persist their messages automatically — the assistant turn after `llmGenerateText`, and the `tool_result` user turn when all delegated tools complete (sync or async). Pass `config: { save: false }` on any of them if you want to take over persistence.

### Adding User Interaction

Pause for user input between LLM turns:

```typescript
// Instead of final transition, go to waiting_for_user
@Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
@Guard('isEndTurn')
respondToUser(state: AgentState) {}

@Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
async userMessage(state: AgentState, input: TransitionInput<string>) {
  await this.documentStore.save(LlmMessageDocument, {
    role: 'user',
    text: input.data,
  });
}
```

> **Tip:** The `@loopstack/agent` package ships `ChatAgentWorkflow` which implements this pattern out of the box. Use it when you need a multi-turn chat agent without customization.

### Wrapping an Agent as a Tool

Make an agent callable by other agents via a task tool:

```typescript
@Tool({
  name: 'explore_codebase',
  description: 'Launch a sub-agent to explore the codebase.',
  schema: z.object({ instructions: z.string() }),
})
export class ExploreTask extends BaseTool {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  protected async handle(
    args: { instructions: string },
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolResult> {
    const result = await this.agentWorkflow.run(
      {
        system: 'You are a codebase exploration agent.',
        tools: ['glob', 'grep', 'read'],
        userMessage: args.instructions,
      },
      { callback: options?.callback },
    );

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    const data = result as { data?: { response?: string } };
    return { data: data.data?.response ?? result };
  }
}
```

This enables multi-agent architectures where an orchestrator agent delegates tasks to specialized sub-agents.

## Registry References

- [@loopstack/agent](https://loopstack.ai/registry/loopstack-agent) — Built-in agent workflow module
- [@loopstack/code-agent](https://loopstack.ai/registry/loopstack-code-agent) — Code exploration agent (ExploreTask) built on @loopstack/agent
- [delegate-error-example-workflow](https://loopstack.ai/registry/loopstack-delegate-error-example-workflow) — Example demonstrating tool error handling and recovery
