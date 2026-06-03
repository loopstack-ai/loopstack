# Setup

## Install

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

2. Inject the `ToolCallWorkflow` workflow into your workspace class via the constructor:

```typescript
import { ToolCallWorkflow } from '@loopstack/tool-call-example-workflow';

export class DefaultWorkspace {
  constructor(public readonly toolCall: ToolCallWorkflow) {}
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.

## Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```
