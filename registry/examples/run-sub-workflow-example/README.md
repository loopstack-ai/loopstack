# @loopstack/run-sub-workflow-example

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example demonstrating how to execute child workflows from within a parent workflow for hierarchical workflow composition.

## Overview

The Run Sub Workflow Example shows how to build workflows that spawn and manage child workflows asynchronously. It demonstrates a parent workflow that starts sub-workflows, tracks their completion status through a callback mechanism, and receives result data from the child workflows.

By using this example as a reference, you'll learn how to:

- Use `@InjectWorkflow()` and `.run()` to start child workflows asynchronously
- Set up callback transitions to handle sub-workflow completion
- Define callback schemas with `CallbackSchema.extend()` to type callback payloads
- Return structured data from sub-workflows via the return value of `@Initial` methods
- Display real-time status updates using `LinkDocument`
- Compose complex workflows from smaller, reusable workflow components
- Chain multiple sequential sub-workflow executions

This example is essential for developers building workflows that need to orchestrate multiple workflow executions or break down complex processes into manageable sub-workflows.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Workflows

#### Parent Workflow

The parent workflow uses `@InjectWorkflow()` to inject the sub-workflow class and calls `.run()` to start it:

```typescript
@Workflow({ uiConfig: __dirname + '/run-sub-workflow-example-parent.ui.yaml' })
export class RunSubWorkflowExampleParentWorkflow extends BaseWorkflow {
  @InjectWorkflow() private runSubWorkflowExampleSub: RunSubWorkflowExampleSubWorkflow;
}
```

#### Sub-Workflow

The sub-workflow returns structured data from its `@Initial` method. This data is delivered to the parent workflow via the callback payload:

```typescript
@Workflow({ uiConfig: __dirname + '/run-sub-workflow-example-sub.ui.yaml' })
export class RunSubWorkflowExampleSubWorkflow extends BaseWorkflow {
  @Initial({ to: 'end' })
  async message(): Promise<{ message: string }> {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: 'Sub workflow completed.',
    });
    return { message: 'Hi mom!' };
  }
}
```

### Key Concepts

#### 1. Running a Sub-Workflow with Callbacks

Use `.run()` on the injected workflow to start it asynchronously. Pass a `callback` option specifying which transition to trigger when the sub-workflow completes:

```typescript
@Initial({ to: 'sub_workflow_started' })
async runWorkflow() {
  const result: QueueResult = await this.runSubWorkflowExampleSub.run(
    {},
    { alias: 'runSubWorkflowExampleSub', callback: { transition: 'subWorkflowCallback' } },
  );
  await this.repository.save(
    LinkDocument,
    { label: 'Executing Sub-Workflow...', workflowId: result.workflowId },
    { id: `link_${result.workflowId}` },
  );
}
```

#### 2. Defining Callback Schemas

Extend `CallbackSchema` to type the callback payload. The base schema includes `workflowId`, and you add your custom `data` shape:

```typescript
const SubWorkflowCallbackSchema = CallbackSchema.extend({
  data: z.object({ message: z.string() }),
});
type SubWorkflowCallback = z.infer<typeof SubWorkflowCallbackSchema>;
```

#### 3. Handling the Callback

Define a transition with `wait: true` and the callback schema. The payload contains both the `workflowId` and the `data` returned by the sub-workflow:

```typescript
@Transition({ from: 'sub_workflow_started', to: 'sub_workflow_ended', wait: true, schema: SubWorkflowCallbackSchema })
async subWorkflowCallback(payload: SubWorkflowCallback) {
  await this.repository.save(
    LinkDocument,
    { label: 'Sub-Workflow', status: 'success', workflowId: payload.workflowId },
    { id: `link_${payload.workflowId}` },
  );
  await this.repository.save(MessageDocument, {
    role: 'assistant',
    content: `A message from sub workflow 1: ${payload.data.message}`,
  });
}
```

#### 4. Displaying Status with LinkDocument

Use `LinkDocument` to display a clickable link to the sub-workflow with status updates:

```typescript
await this.repository.save(
  LinkDocument,
  { label: 'Executing Sub-Workflow...', workflowId: result.workflowId },
  { id: `link_${result.workflowId}` },
);
```

After completion, update the same document to show success:

```typescript
await this.repository.save(
  LinkDocument,
  { label: 'Sub-Workflow', status: 'success', workflowId: payload.workflowId },
  { id: `link_${payload.workflowId}` },
);
```

#### 5. Chaining Multiple Sub-Workflows

The parent workflow demonstrates running two sub-workflows sequentially. After the first callback completes, a second sub-workflow is started with its own callback. The second callback uses `@Final` to end the parent workflow:

```typescript
@Transition({ from: 'sub_workflow_ended', to: 'sub_workflow2_started' })
async runWorkflow2() {
  const result: QueueResult = await this.runSubWorkflowExampleSub.run(
    {},
    { alias: 'runSubWorkflowExampleSub', callback: { transition: 'subWorkflow2Callback' } },
  );
  await this.repository.save(
    LinkDocument,
    { label: 'Executing Sub-Workflow 2...', workflowId: result.workflowId },
    { id: `link_${result.workflowId}` },
  );
}

@Final({ from: 'sub_workflow2_started', wait: true, schema: SubWorkflowCallbackSchema })
async subWorkflow2Callback(payload: SubWorkflowCallback) {
  await this.repository.save(
    LinkDocument,
    { label: 'Sub-Workflow 2', status: 'success', workflowId: payload.workflowId },
    { id: `link_${payload.workflowId}` },
  );
  await this.repository.save(MessageDocument, {
    role: 'assistant',
    content: `A message from sub workflow 2: ${payload.data.message}`,
  });
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework decorators (`BaseWorkflow`, `@Workflow`, `@Initial`, `@Transition`, `@Final`, `@InjectWorkflow`, `CallbackSchema`, `QueueResult`)
- `@loopstack/core` - Provides `LinkDocument` and `MessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
