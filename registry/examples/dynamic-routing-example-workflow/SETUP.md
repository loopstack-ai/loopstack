# Setup

## Install

```bash
npm install --save @loopstack/dynamic-routing-example-workflow
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `DynamicRoutingExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { DynamicRoutingExampleModule } from '@loopstack/dynamic-routing-example-workflow';

@Module({
  imports: [DynamicRoutingExampleModule],
})
export class DefaultModule {}
```

2. Inject the `DynamicRoutingExampleWorkflow` workflow into your workspace class via the constructor:

```typescript
import { DynamicRoutingExampleWorkflow } from '@loopstack/dynamic-routing-example-workflow';

export class DefaultWorkspace {
  constructor(public readonly dynamicRoutingExample: DynamicRoutingExampleWorkflow) {}
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.
