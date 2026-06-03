# Setup

## Install

```bash
npm install --save @loopstack/run-sub-workflow-example
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `RunSubWorkflowExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { RunSubWorkflowExampleModule } from '@loopstack/run-sub-workflow-example';

@Module({
  imports: [RunSubWorkflowExampleModule],
})
export class DefaultModule {}
```

2. Inject the workflows into your workspace class via the constructor:

```typescript
import {
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleSubWorkflow,
} from '@loopstack/run-sub-workflow-example';

export class DefaultWorkspace {
  constructor(
    public readonly runSubWorkflowExampleParent: RunSubWorkflowExampleParentWorkflow,
    public readonly runSubWorkflowExampleSub: RunSubWorkflowExampleSubWorkflow,
  ) {}
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.
