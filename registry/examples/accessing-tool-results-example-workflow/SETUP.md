# Setup

## Install

```bash
npm install --save @loopstack/accessing-tool-results-example-workflow
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `ToolResultsExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { ToolResultsExampleModule } from '@loopstack/accessing-tool-results-example-workflow';

@Module({
  imports: [ToolResultsExampleModule],
})
export class DefaultModule {}
```

2. Inject the `WorkflowToolResultsWorkflow` workflow into your workspace class using the `@InjectWorkflow()` decorator:

```typescript
import { WorkflowToolResultsWorkflow } from '@loopstack/accessing-tool-results-example-workflow';

export class DefaultWorkspace {
  @InjectWorkflow() workflowToolResults: WorkflowToolResultsWorkflow;
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.
