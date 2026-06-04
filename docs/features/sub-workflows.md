# Sub-Workflows

Execute workflows within other workflows using constructor injection and `.run()`. The parent workflow pauses at a `wait: true` transition until the sub-workflow completes.

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
    { prompt: 'Hello' },                    // Args passed to the sub-workflow
    {
      alias: 'subWorkflow',                  // Identifier for this instance
      callback: { transition: 'onSubComplete' },  // Method to call when done
    },
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
async onSubComplete(state: MyState, payload: { workflowId: string; data: { message: string } }): Promise<MyState> {
  // Update the link document
  await this.documentStore.save(LinkDocument, {
    label: 'Sub-Workflow',
    status: 'success',
    workflowId: payload.workflowId,
  }, { id: `link_${payload.workflowId}` });

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    content: `Sub-workflow said: ${payload.data.message}`,
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
  async run(): Promise<{ message: string }> {
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
    const result: QueueResult = await this.subWorkflow.run(
      {},
      { alias: 'subWorkflow', callback: { transition: 'subWorkflowCallback' } },
    );

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
    payload: { workflowId: string; data: { message: string } },
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
      content: `Message from sub-workflow: ${payload.data.message}`,
    });
    return {};
  }
}
```

## Registering Sub-Workflows

Both workflows must be registered in the module:

```typescript
@Module({
  imports: [LoopCoreModule],
  providers: [ParentWorkflow, SubWorkflow],
  exports: [ParentWorkflow, SubWorkflow],
})
export class MyModule {}
```

## Registry References

- [run-sub-workflow-example](https://loopstack.ai/registry/loopstack-run-sub-workflow-example) — Parent workflow calling a sub-workflow with callbacks, LinkDocument tracking, and output passing
