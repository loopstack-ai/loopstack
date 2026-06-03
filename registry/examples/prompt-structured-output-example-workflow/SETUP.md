# Setup

## Install

```bash
npm install --save @loopstack/prompt-structured-output-example-workflow
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `PromptStructuredOutputExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { PromptStructuredOutputExampleModule } from '@loopstack/prompt-structured-output-example-workflow';

@Module({
  imports: [PromptStructuredOutputExampleModule],
})
export class DefaultModule {}
```

2. Inject the `PromptStructuredOutputWorkflow` workflow into your workspace class via the constructor:

```typescript
import { PromptStructuredOutputWorkflow } from '@loopstack/prompt-structured-output-example-workflow';

export class DefaultWorkspace {
  constructor(public readonly promptStructuredOutput: PromptStructuredOutputWorkflow) {}
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.

## Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```
