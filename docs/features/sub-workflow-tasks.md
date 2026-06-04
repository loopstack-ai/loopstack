# Sub-Workflow Tasks

Launch workflows from other workflows. Wrap them as tools so agents can decide when to run them.

## Define a Sub-Workflow

Any workflow can be launched as a sub-workflow. It just needs a schema for its input and a return value from its final transition:

```typescript
@Workflow({
  widget: __dirname + '/test-runner.ui.yaml',
  schema: z.object({
    testDirectory: z.string(),
  }),
})
export class TestRunnerWorkflow extends BaseWorkflow<{ testDirectory: string }> {
  constructor(
    private readonly bash: BashTool,
    private readonly read: ReadTool,
  ) {
    super();
  }

  @Transition({ to: 'running' })
  async runTests(state: Record<string, unknown>, ctx: LoopstackContext): Promise<Record<string, unknown>> {
    const args = ctx.args as { testDirectory: string };
    await this.bash.call({ command: `npm test -- ${args.testDirectory}` });
    return state;
  }

  @Transition({ from: 'running', to: 'end' })
  async done(): Promise<{ passed: boolean; output: string }> {
    return { passed: true, output: 'All tests passed.' };
  }
}
```

## Wrap It as a Task Tool

A task tool is a `BaseTool` that launches a sub-workflow and returns `pending`. The framework calls `complete()` when the sub-workflow finishes:

```typescript
@Tool({
  name: 'run_tests',
  description: 'Run tests in the specified directory. IMPORTANT: This must be the only tool call.',
  schema: z.object({
    testDirectory: z.string().describe('Directory containing the test files to run.'),
  }),
})
export class RunTestsTask extends BaseTool {
  constructor(private readonly testRunner: TestRunnerWorkflow) {
    super();
  }

  protected async handle(
    args: { testDirectory: string },
    ctx: LoopstackContext,
    options?: ToolCallOptions,
  ): Promise<ToolResult> {
    const result = await this.testRunner.run(
      { testDirectory: args.testDirectory },
      { alias: 'testRunner', callback: options?.callback },
    );

    await this.documentStore.save(
      LinkDocument,
      { status: 'pending', label: 'Running tests...', workflowId: result.workflowId, embed: true },
      { id: `test_link_${result.workflowId}` },
    );

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    const data = result as { workflowId?: string; data?: { passed: boolean; output: string } };

    await this.documentStore.save(
      LinkDocument,
      { status: data.data?.passed ? 'success' : 'failure', label: 'Tests complete', workflowId: data.workflowId! },
      { id: `test_link_${data.workflowId}` },
    );

    return { data: data.data ?? result };
  }
}
```

The key parts:

- **`pending: { workflowId }`** tells the framework this tool is async — the parent workflow waits for a callback
- **`callback: options?.callback`** passes the parent's callback config to the sub-workflow, so the result routes back automatically
- **`complete()`** is called when the sub-workflow reaches its final transition. Transform the result here and update UI documents.
- **`LinkDocument`** gives visual feedback — shows a pending indicator while the sub-workflow runs, then updates with the result

## Use It in an Agent

Register the task tool and its sub-workflow in your module, then add it to the agent's tool list:

```typescript
// In the parent agent workflow
@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn(state: AgentState): Promise<AgentState> {
  const result = await this.llmGenerateText.call(
    {},
    {
      config: {
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        system: 'You are a build agent. Run tests when implementation is complete.',
        tools: ['read', 'write', 'edit', 'run_tests'],
      },
    },
  );
  return { ...state, llmResult: result.data };
}
```

The LLM sees `run_tests` as a tool with the description from `@Tool({ description })`. When it calls the tool, the sub-workflow launches in the background. The parent agent pauses at `awaiting_tools` until the sub-workflow completes, then continues its loop with the test results.

Make sure the parent workflow has `callback: { transition: 'toolResultReceived' }` in its `llmDelegateToolCalls.call()` so async results are routed back. See [Agent Workflows](/docs/features/agent-workflows) for the full pattern.

## Nested Agents

The sub-workflow doesn't have to be a simple workflow — it can be an `AgentWorkflow` itself. This creates multi-agent architectures where a high-level orchestrator delegates to specialized agents:

```typescript
@Tool({
  name: 'explore_codebase',
  description: 'Launch an agent to explore the codebase.',
  schema: z.object({ instructions: z.string() }),
})
export class ExploreTask extends BaseTool {
  constructor(private readonly agent: AgentWorkflow) {
    super();
  }

  protected async handle(
    args: { instructions: string },
    ctx: LoopstackContext,
    options?: ToolCallOptions,
  ): Promise<ToolResult> {
    const result = await this.agent.run(
      {
        system: 'You are a codebase exploration agent.',
        tools: ['glob', 'grep', 'read'],
        userMessage: args.instructions,
      },
      { alias: 'exploreAgent', callback: options?.callback },
    );

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }
}
```

An orchestrator agent can have multiple task tools — `exploreTask`, `implementTask`, `runTestsTask` — and decide which sub-agent to launch based on the conversation. Each sub-agent runs independently with its own tool loop and reports back when done.

## Registry References

- [@loopstack/agent](https://loopstack.ai/registry/loopstack-agent) — Built-in agent workflow used as sub-workflow
- [@loopstack/code-agent](https://loopstack.ai/registry/loopstack-code-agent) — ExploreTask wrapping AgentWorkflow for codebase exploration
- [sub-workflow-example](https://loopstack.ai/registry/loopstack-run-sub-workflow-example) — Basic sub-workflow launching and callback handling
