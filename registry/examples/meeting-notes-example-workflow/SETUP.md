# Setup

## Install

```bash
npm install --save @loopstack/meeting-notes-example-workflow
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `MeetingNotesExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { MeetingNotesExampleModule } from '@loopstack/meeting-notes-example-workflow';

@Module({
  imports: [MeetingNotesExampleModule],
})
export class DefaultModule {}
```

2. Inject the `MeetingNotesWorkflow` workflow into your workspace class using the `@InjectWorkflow()` decorator:

```typescript
import { MeetingNotesWorkflow } from '@loopstack/meeting-notes-example-workflow';

export class DefaultWorkspace {
  @InjectWorkflow() meetingNotes: MeetingNotesWorkflow;
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.

## Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```
