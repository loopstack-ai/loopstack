# Setup

There are three ways to add this module to your Loopstack project.

## Option 1: `loopstack add` (recommended)

```bash
loopstack add @loopstack/meeting-notes-example-workflow
```

This copies the source files into your project directory and automatically registers the module and workflows in your application.

- Full access to the source code for learning, exploring and customizing
- The CLI handles module and workflow registration for you (imports, module setup, workflow injection)
- Best for getting started or when you want to modify the code

## Option 2: `loopstack install`

```bash
loopstack install @loopstack/meeting-notes-example-workflow
```

This installs the package as an npm dependency and automatically registers the module and workflows — without copying any source files into your project.

- The module is imported directly from `node_modules`
- The CLI handles module and workflow registration for you (imports, module setup, workflow injection)
- Best when you don't need to modify the source code and want to receive updates via npm

## Option 3: Manual `npm install`

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
