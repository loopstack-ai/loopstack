---
title: Sub-Workflows
description: Running workflows inside other workflows via .run(), callback transitions, passing arguments to child workflows, and receiving sub-workflow results.
---

# Sub-Workflows

Sub-workflows let you compose complex automations from smaller, reusable workflow building blocks. A parent workflow can launch one or more child workflows via `.run()`, pause until they complete, and receive results through a callback transition.

## Injecting a Sub-Workflow

```typescript
import { CallbackSchema, QueueResult } from '@loopstack/common';

constructor(private readonly subWorkflow: SubWorkflow) {
  super();
}
```

## Running a Sub-Workflow

```typescript
@Transition({ to: 'sub_started' })
async start(state: MyState): Promise<MyState> {
  const result: QueueResult = await this.subWorkflow.run(
    { prompt: 'Hello' },                         // Args passed to the sub-workflow
    { callback: { transition: 'onSubComplete' } }, // Method to call when done
  );

  // Track with a link document
  await this.documentStore.save(LinkDocument, {
    label: 'Running sub-workflow...',
    workflowId: result.workflowId,
  }, { id: `link_${result.workflowId}` });
  return state;
}
```

## Receiving the Callback

The sub-workflow's final transition return value is passed as `payload.data`:

```typescript
const SubWorkflowCallbackSchema = CallbackSchema.extend({
  data: z.object({ message: z.string() }),
});

@Transition({
  from: 'sub_started',
  to: 'sub_done',
  wait: true,
  schema: SubWorkflowCallbackSchema,
})
async onSubComplete(state: MyState, payload: { workflowId: string; status: string; data: { message: string } }): Promise<MyState> {
  // Update the link document
  await this.documentStore.save(LinkDocument, {
    label: 'Sub-Workflow',
    status: 'success',
    workflowId: payload.workflowId,
  }, { id: `link_${payload.workflowId}` });

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Sub-workflow said: ${payload.data.message}`,
  });
  return state;
}
```

## Sub-Workflow Output

The sub-workflow defines its output as the return value of its final transition:

```typescript
@Workflow({ widget: __dirname + '/sub.ui.yaml' })
export class SubWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  async start(): Promise<{ message: string }> {
    return { message: 'Hi mom!' };
  }
}
```

## Complete Example

```typescript
@Workflow({ widget: __dirname + '/parent.ui.yaml' })
export class ParentWorkflow extends BaseWorkflow {
  constructor(private readonly subWorkflow: SubWorkflow) {
    super();
  }

  @Transition({ to: 'sub_started' })
  async runWorkflow(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result: QueueResult = await this.subWorkflow.run({}, { callback: { transition: 'subWorkflowCallback' } });

    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Executing Sub-Workflow...',
        workflowId: result.workflowId,
      },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Transition({
    from: 'sub_started',
    to: 'end',
    wait: true,
    schema: CallbackSchema.extend({ data: z.object({ message: z.string() }) }),
  })
  async subWorkflowCallback(
    state: Record<string, unknown>,
    payload: { workflowId: string; status: string; data: { message: string } },
  ): Promise<unknown> {
    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Sub-Workflow',
        status: 'success',
        workflowId: payload.workflowId,
      },
      { id: `link_${payload.workflowId}` },
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Message from sub-workflow: ${payload.data.message}`,
    });
    return {};
  }
}
```

## Registering Sub-Workflows

Both workflows must be registered in the module:

```typescript
@Module({
  providers: [ParentWorkflow, SubWorkflow],
  exports: [ParentWorkflow, SubWorkflow],
})
export class MyModule {}
```

## Wrapping as a Task Tool

A task tool is a `BaseTool` that launches a sub-workflow and returns `pending`. The framework calls `complete()` when the sub-workflow finishes. This lets agents decide when to run sub-workflows.

```typescript
@Tool({
  name: 'run_tests',
  description: 'Run tests in the specified directory.',
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
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolResult> {
    const result = await this.testRunner.run({ testDirectory: args.testDirectory }, { callback: options?.callback });

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

Key parts:

- **`pending: { workflowId }`** tells the framework this tool is async — the parent workflow waits for a callback
- **`callback: options?.callback`** passes the parent's callback config to the sub-workflow
- **`complete()`** is called when the sub-workflow finishes — transform results and update UI documents here
- **`LinkDocument`** gives visual feedback while the sub-workflow runs

## Nested Agents

The sub-workflow can be an `AgentWorkflow` itself, enabling multi-agent architectures. See [Agent Workflows](../ai/agent-workflows.md) for the full pattern.

## Registry References

- [run-sub-workflow-example](https://loopstack.ai/registry/loopstack-run-sub-workflow-example) — Parent workflow calling a sub-workflow with callbacks, LinkDocument tracking, and output passing
- [@loopstack/code-agent](https://loopstack.ai/registry/loopstack-code-agent) — ExploreTask wrapping AgentWorkflow as a task tool
