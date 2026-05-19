# Setup

## Install

```bash
npm install --save @loopstack/chat-example-workflow
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `ChatExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { ChatExampleModule } from '@loopstack/chat-example-workflow';

@Module({
  imports: [ChatExampleModule],
})
export class DefaultModule {}
```

2. Inject the `ChatWorkflow` workflow into your workspace class using the `@InjectWorkflow()` decorator:

```typescript
import { ChatWorkflow } from '@loopstack/chat-example-workflow';

export class DefaultWorkspace {
  @InjectWorkflow() chat: ChatWorkflow;
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.

## Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```
