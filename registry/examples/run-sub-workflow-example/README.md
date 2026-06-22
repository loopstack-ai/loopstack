---
title: Sub-Workflow Example
description: Example executing child workflows from a parent workflow — workflow.run(), hierarchical workflow composition, callback transitions, the show option for parent-view rendering (inline embed, link, hidden), and graceful handling of failed sub-workflows
---

# @loopstack/run-sub-workflow-example

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example demonstrating how to execute child workflows from within a parent workflow for hierarchical workflow composition.

## Overview

The Run Sub Workflow Example shows how to build workflows that spawn and manage child workflows asynchronously. It demonstrates a parent workflow that starts sub-workflows, tracks their completion through a callback mechanism, and receives result data from the child workflows.

By using this example as a reference, you'll learn how to:

- Use constructor injection and `.run()` to start child workflows asynchronously
- Set up callback transitions to handle sub-workflow completion
- Type the wait transition's `data` via the `schema:` option and receive the full `TransitionInput<TData>` envelope on the method
- Return structured data from sub-workflows by calling `this.setResult(...)` in the final `@Transition` method
- Control how a child appears in the parent's run view via the `show` option (`'inline'`, `'link'`, `'hidden'`)
- Handle failed sub-workflows in the parent via `input.hasError` / `input.status` on the envelope
- Compose complex workflows from smaller, reusable workflow components
- Chain multiple sequential sub-workflow executions
- Run sub-workflows in parallel (`FanOutWorkflow`) or in series (`SequenceWorkflow`)

This example is essential for developers building workflows that need to orchestrate multiple workflow executions or break down complex processes into manageable sub-workflows.

## Installation

```bash
npm install @loopstack/run-sub-workflow-example
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { RunSubWorkflowExampleModule, RunSubWorkflowExampleParentWorkflow } from '@loopstack/run-sub-workflow-example';

@StudioApp({
  title: 'Sub-Workflow Example',
  workflows: [
    RunSubWorkflowExampleParentWorkflow,
    RunSubWorkflowExampleFanOutWorkflow,
    RunSubWorkflowExampleSequenceWorkflow,
    RunSubWorkflowExampleShowModesWorkflow,
    RunSubWorkflowExampleErrorHandlingWorkflow,
  ],
})
@Module({
  imports: [RunSubWorkflowExampleModule],
})
export class MyAppModule {}
```

## How It Works

### Workflows

#### Parent Workflow

The parent workflow injects the sub-workflow class and calls `.run()` to start it:

```typescript
@Workflow({ uiConfig: __dirname + '/run-sub-workflow-example-parent.ui.yaml' })
export class RunSubWorkflowExampleParentWorkflow extends BaseWorkflow {
  constructor(private readonly subWorkflow: RunSubWorkflowExampleSubWorkflow) {
    super();
  }
}
```

#### Sub-Workflow

The sub-workflow publishes structured data via `this.setResult(...)` in its final `@Transition` method. This data is delivered to the parent workflow via the callback payload:

```typescript
@Workflow({ uiConfig: __dirname + '/run-sub-workflow-example-sub.ui.yaml' })
export class RunSubWorkflowExampleSubWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  async message() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Sub workflow completed.',
    });
    this.setResult({ message: 'Hi mom!' });
  }
}
```

### Key Concepts

#### 1. Running a Sub-Workflow with Callbacks

Use `.run()` on the injected workflow to start it asynchronously. Pass a `callback` option specifying which transition to trigger when the sub-workflow completes, and a `show` option to control how the child appears in the parent's run view:

```typescript
@Transition({ to: 'sub_workflow_started' })
async runWorkflow() {
  await this.subWorkflow.run(
    {},
    { callback: { transition: 'subWorkflowCallback' }, show: 'link', label: 'Sub-Workflow' },
  );
}
```

#### 2. The `show` Option

`show` controls how the child sub-workflow is rendered inside the parent's run view:

- `'inline'` _(default)_ — embed the child as an inline iframe in the parent's view. Best for HITL/OAuth/interactive children.
- `'link'` — show a status link card; clicking opens the child in a separate window. Best for autonomous children the parent just tracks.
- `'hidden'` — no UI at all. Best for background fan-out.

This example uses `show: 'link'` because the sub-workflows run autonomously without needing user interaction.

#### 3. Defining the Callback `data` Schema

The `schema:` on a `wait: true` transition describes only the `data` field of the envelope. The framework wraps it with `workflowId`, `status`, `hasError`, `errorMessage`:

```typescript
const SubWorkflowMessageSchema = z.object({ message: z.string() });
```

#### 4. Handling the Callback

Define a transition with `wait: true` and the data schema. The method receives a `TransitionInput<TData>` containing both the envelope fields and the validated `data`:

```typescript
import type { TransitionInput } from '@loopstack/common';

@Transition({ from: 'sub_workflow_started', to: 'sub_workflow_ended', wait: true, schema: SubWorkflowMessageSchema })
async subWorkflowCallback(state, input: TransitionInput<{ message: string }>) {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `A message from sub workflow 1: ${input.data.message}`,
  });
}
```

#### 5. Demonstrating Every `show` Mode (`RunSubWorkflowExampleShowModesWorkflow`)

This workflow chains the same sub-workflow three times — once per `show` mode — so you can see (or not see) each mode side-by-side in a single run:

```typescript
await this.sub.run({}, { callback: { transition: 'onInlineDone' }, show: 'inline', label: 'Inline embed (iframe)' });
// ...later...
await this.sub.run({}, { callback: { transition: 'onLinkDone' }, show: 'link', label: 'Status link card' });
// ...later...
await this.sub.run({}, { callback: { transition: 'onHiddenDone' }, show: 'hidden', label: 'Background child' });
```

- `show: 'inline'` — Studio renders the child as an embedded iframe inside the parent's stream and auto-collapses it once the child reaches a terminal state.
- `show: 'link'` — Studio renders a status link card; clicking opens the child in a separate window.
- `show: 'hidden'` — no UI is rendered for the child but the callback still fires normally. Useful when surfacing the child would just be noise.

#### 6. Handling Failed Sub-Workflows (`RunSubWorkflowExampleErrorHandlingWorkflow`)

When a child throws, the parent's callback is still triggered — with `input.hasError === true` and `input.status === 'failed'`. The parent decides whether to recover, retry, or terminate:

```typescript
@Transition({ to: 'awaiting' })
async launch() {
  await this.failingSub.run(
    {},
    { callback: { transition: 'onFinished' }, show: 'inline', label: 'Failing sub-workflow' },
  );
}

@Transition({ from: 'awaiting', to: 'end', wait: true })
async onFinished(state, input: TransitionInput) {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Child finished with status="${input.status}". The parent recovered gracefully.`,
  });
  this.setResult({ childStatus: input.status, errorMessage: input.errorMessage });
}
```

In Studio, the failed child renders with a red link icon and an inline error message under the link card, while the embedded iframe collapses automatically.

#### 7. Running Sub-Workflows in Parallel or Series

For dynamic fan-out and ordered sequencing, use the dedicated helpers from `@loopstack/core`:

- `FanOutWorkflow` (see `RunSubWorkflowExampleFanOutWorkflow`) — launches a map of children concurrently and aggregates their results into a single callback.
- `SequenceWorkflow` (see `RunSubWorkflowExampleSequenceWorkflow`) — runs children one at a time and aggregates their results.

Both surface a single envelope where `input.data` carries `hasErrors` / `errorCount` plus per-child results, so the parent doesn't need a transition per child.

#### 8. Chaining Multiple Sub-Workflows

The parent workflow demonstrates running two sub-workflows sequentially. After the first callback completes, a second sub-workflow is started with its own callback. The second callback uses a terminal `@Transition` to end the parent workflow:

```typescript
@Transition({ from: 'sub_workflow_ended', to: 'sub_workflow2_started' })
async runWorkflow2() {
  await this.subWorkflow.run(
    {},
    { callback: { transition: 'subWorkflow2Callback' }, show: 'link', label: 'Sub-Workflow 2' },
  );
}

@Transition({ from: 'sub_workflow2_started', to: 'end', wait: true, schema: SubWorkflowMessageSchema })
async subWorkflow2Callback(state, input: TransitionInput<{ message: string }>) {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `A message from sub workflow 2: ${input.data.message}`,
  });
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core workflow/runtime APIs (`BaseWorkflow`, `@Workflow`, `@Transition`, `TransitionInput`, `MessageDocument`)

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
