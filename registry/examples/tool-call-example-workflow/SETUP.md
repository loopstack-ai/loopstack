# Setup

There are three ways to add this module to your Loopstack project.

## Option 1: `loopstack add` (recommended)

```bash
loopstack add @loopstack/tool-call-example-workflow
```

This copies the source files into your project directory and automatically registers the module and workflows in your application.

- Full access to the source code for learning, exploring and customizing
- The CLI handles module and workflow registration for you (imports, module setup, workflow injection)
- Best for getting started or when you want to modify the code

## Option 2: `loopstack install`

```bash
loopstack install @loopstack/tool-call-example-workflow
```

This installs the package as an npm dependency and automatically registers the module and workflows — without copying any source files into your project.

- The module is imported directly from `node_modules`
- The CLI handles module and workflow registration for you (imports, module setup, workflow injection)
- Best when you don't need to modify the source code and want to receive updates via npm

## Option 3: Manual `npm install`

```bash
npm install --save @loopstack/tool-call-example-workflow
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `ToolCallingExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { ToolCallingExampleModule } from '@loopstack/tool-call-example-workflow';

@Module({
  imports: [ToolCallingExampleModule],
})
export class DefaultModule {}
```

2. Inject the `ToolCallWorkflow` workflow into your workspace class using the `@InjectWorkflow()` decorator:

```typescript
import { ToolCallWorkflow } from '@loopstack/tool-call-example-workflow';

export class DefaultWorkspace {
  @InjectWorkflow() toolCall: ToolCallWorkflow;
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.

## Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```
