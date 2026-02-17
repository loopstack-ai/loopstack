# Setup

There are three ways to add this module to your Loopstack project.

## Option 1: `loopstack add` (recommended)

```bash
loopstack add @loopstack/accessing-tool-results-example-workflow
```

This copies the source files into your project directory and automatically registers the module and workflows in your application.

- Full access to the source code for learning, exploring and customizing
- The CLI handles module and workflow registration for you (imports, module setup, workflow injection)
- Best for getting started or when you want to modify the code

## Option 2: `loopstack install`

```bash
loopstack install @loopstack/accessing-tool-results-example-workflow
```

This installs the package as an npm dependency and automatically registers the module and workflows — without copying any source files into your project.

- The module is imported directly from `node_modules`
- The CLI handles module and workflow registration for you (imports, module setup, workflow injection)
- Best when you don't need to modify the source code and want to receive updates via npm

## Option 3: Manual `npm install`

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
