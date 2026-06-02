# Setup

## Install

```bash
npm install --save @loopstack/custom-tool-example-module
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `CustomToolModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { CustomToolModule } from '@loopstack/custom-tool-example-module';

@Module({
  imports: [CustomToolModule],
})
export class DefaultModule {}
```

2. Inject the `CustomToolExampleWorkflow` workflow into your workspace class via the constructor:

```typescript
import { CustomToolExampleWorkflow } from '@loopstack/custom-tool-example-module';

export class DefaultWorkspace {
  constructor(public readonly customToolExample: CustomToolExampleWorkflow) {}
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.
