# Setup

## Install

```bash
npm install --save @loopstack/sandbox-example-workflow
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `SandboxExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { SandboxExampleModule } from '@loopstack/sandbox-example-workflow';

@Module({
  imports: [SandboxExampleModule],
})
export class DefaultModule {}
```

2. Inject the `SandboxExampleWorkflow` workflow into your workspace class using the `@InjectWorkflow()` decorator:

```typescript
import { SandboxExampleWorkflow } from '@loopstack/sandbox-example-workflow';

export class DefaultWorkspace {
  @InjectWorkflow() sandboxExample: SandboxExampleWorkflow;
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.
