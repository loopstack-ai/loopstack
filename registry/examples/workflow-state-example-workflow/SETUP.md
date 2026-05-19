# Setup

## Install

```bash
npm install --save @loopstack/workflow-state-example-workflow
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `WorkflowStateExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { WorkflowStateExampleModule } from '@loopstack/workflow-state-example-workflow';

@Module({
  imports: [WorkflowStateExampleModule],
})
export class DefaultModule {}
```

2. Inject the `WorkflowStateWorkflow` workflow into your workspace class using the `@InjectWorkflow()` decorator:

```typescript
import { WorkflowStateWorkflow } from '@loopstack/workflow-state-example-workflow';

export class DefaultWorkspace {
  @InjectWorkflow() workflowState: WorkflowStateWorkflow;
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.
