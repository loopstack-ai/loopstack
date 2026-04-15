# Creating Workflows

A workflow is a **state machine** defined as a TypeScript class. It extends `BaseWorkflow` and uses decorators to define transitions between states.

## Chat Example

A simple chat workflow: wait for a user message, call LLM, display the response, and loop back.

```typescript
import { z } from 'zod';
import { ClaudeGenerateText, ClaudeMessageDocument } from '@loopstack/claude-module';
import { BaseWorkflow, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/chat.ui.yaml', // UI config
})
export class ChatWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;

  // 1. Entry point
  @Initial({
    to: 'waiting_for_user',
  })
  async setup() {}

  // 2. Wait for user message
  @Transition({
    from: 'waiting_for_user',
    to: 'ready',
    wait: true,
    schema: z.string(),
  })
  async userMessage(payload: string) {
    await this.repository.save(ClaudeMessageDocument, { role: 'user', content: payload });
  }

  // 3. Call LLM and loop back
  @Transition({
    from: 'ready',
    to: 'waiting_for_user',
  })
  async llmTurn() {
    const result = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
    });

    // Create the assistant's response
    await this.repository.save(ClaudeMessageDocument, result.data!);
  }
}
```

That's a complete workflow. The state flow is:

```
start → waiting_for_user → [user sends message] → ready → llmTurn → waiting_for_user (loop)
```

## The `@Workflow` Decorator

```typescript
@Workflow({
  uiConfig: __dirname + '/chat.ui.yaml',  // UI-only YAML config
})
```

- **`uiConfig`** — Path to `.ui.yaml` file or inline config object containing UI widget configuration (optional)
- **`schema`** — Zod schema that validates workflow input arguments (optional):

```typescript
@Workflow({
  uiConfig: __dirname + '/prompt.ui.yaml',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
```

## `BaseWorkflow`

All workflows extend `BaseWorkflow`, which provides:

| Property / Method          | Description                                                                      |
| -------------------------- | -------------------------------------------------------------------------------- |
| `this.repository`          | Save and query documents via `this.repository.save(DocClass, content, options?)` |
| `this.ctx.args`            | The validated workflow input arguments                                           |
| `this.ctx.context`         | Execution context (`userId`, `workspaceId`, `workflowId`, etc.)                  |
| `this.ctx.runtime`         | Runtime metadata (documents, place, status, transitions, result)                 |
| `this.ctx.parent`          | Parent workflow instance (when running as a sub-workflow)                        |
| `this.render(path, data?)` | Render a Handlebars template file                                                |
| `this.orchestrator`        | Queue sub-workflows and fire callbacks programmatically                          |

### `this.ctx.context` (RunContext)

| Property                            | Description                                     |
| ----------------------------------- | ----------------------------------------------- |
| `this.ctx.context.userId`           | Current user ID                                 |
| `this.ctx.context.workspaceId`      | Current workspace ID                            |
| `this.ctx.context.workflowId`       | Current workflow ID                             |
| `this.ctx.context.parentWorkflowId` | Parent workflow ID (if running as sub-workflow) |
| `this.ctx.context.labels`           | Labels attached to this run                     |
| `this.ctx.context.payload`          | Run payload data                                |
| `this.ctx.context.workflowContext`  | Arbitrary key-value context for the workflow    |

### `this.ctx.runtime` (WorkflowMetadataInterface)

| Property                       | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| `runtime.documents`            | Array of `DocumentEntity` in this workflow               |
| `runtime.place`                | Current place (node) in the workflow graph               |
| `runtime.status`               | Workflow state (`running`, `waiting`, `completed`, etc.) |
| `runtime.transition`           | The transition that triggered the current step           |
| `runtime.availableTransitions` | Transitions available from the current place             |
| `runtime.tools`                | Tool instances registered in this workflow               |
| `runtime.result`               | Workflow result (set from transition return values)      |
| `runtime.hasError`             | Whether the workflow is in an error state                |
| `runtime.errorMessage`         | Error message (if `hasError` is true)                    |
| `runtime.stop`                 | Whether the workflow has been stopped                    |

## Transition Types

### `@Initial` — Entry Point

Runs once when the workflow starts. Receives validated args as a parameter.

```typescript
@Initial({ to: 'ready' })
async setup(args: { subject: string }) {
  // args validated against the @Workflow schema
}
```

Options: `to` (required), `wait`, `priority`, `schema`.

Each workflow must have exactly one `@Initial` transition.

### `@Transition` — State Change

Moves between states. Fires automatically unless `wait: true` is set.

```typescript
@Transition({ from: 'ready', to: 'processed' })
async doWork() {
  const result = await this.myTool.call({ query: 'hello' });
  this.data = result.data;
}
```

Options: `from` (required), `to` (required), `wait`, `priority`, `schema`.

A method can listen on **multiple source states**:

```typescript
@Transition({ from: 'ready', to: 'prompt_executed' })
@Transition({ from: 'tools_done', to: 'prompt_executed' })
async llmTurn() { ... }
```

**Constraint:** At most one unguarded auto-transition per state. Multiple transitions from the same state require guards and priorities.

### `@Final` — Completion

Terminal transition. Automatically transitions to `end`. The return value is the workflow's output (passed to parent workflow callbacks).

```typescript
@Final({ from: 'done' })
async finish(): Promise<{ concept: string }> {
  return { concept: this.confirmedConcept! };
}
```

Options: `from` (required), `wait`, `priority`, `schema`.

### Transition Return Values

Any transition can return a value. It's captured in `this.ctx.runtime.result` and persisted:

```typescript
@Transition({ from: 'ready', to: 'processed' })
async process() {
  const result = await this.myTool.call({ ... });
  return { summary: result.data };  // available as this.ctx.runtime.result
}
```

For `@Final`, the return value is also forwarded to the parent workflow's callback payload.

## State

State is stored as **plain instance properties** — automatically checkpointed and restored across transitions via a state management proxy.

```typescript
export class MyWorkflow extends BaseWorkflow {
  counter: number = 0;
  llmResult?: ClaudeGenerateTextResult;

  @Transition({ from: 'ready', to: 'processed' })
  async process() {
    this.counter++;
    const result = await this.claudeGenerateText.call({ ... });
    this.llmResult = result.data;
  }
}
```

No decorator needed. Values persist even when the workflow pauses and resumes. Properties injected via `@InjectTool()`, `@InjectWorkflow()`, or `@Inject()` are pass-through and not managed as state.

## Injecting Tools

Tools are injected with `@InjectTool()` and called directly in transition methods:

```typescript
@InjectTool() claudeGenerateText: ClaudeGenerateText;

@Transition({ from: 'ready', to: 'done' })
async process() {
  const result = await this.claudeGenerateText.call({
    claude: { model: 'claude-sonnet-4-6' },
    prompt: 'Write a haiku',
  });
}
```

## Documents

Use `this.repository.save()` to create or update documents. Reference document classes directly — no injection needed.

```typescript
// Create a document
await this.repository.save(ClaudeMessageDocument, {
  role: 'user',
  content: 'Hello!',
});

// Update an existing document by ID
await this.repository.save(
  ClaudeMessageDocument,
  { role: 'assistant', content: 'Updated response' },
  { id: 'response-1' },
);

// Hidden document (not shown in UI)
await this.repository.save(
  ClaudeMessageDocument,
  { role: 'user', content: 'System prompt' },
  { meta: { hidden: true } },
);

// Query documents
const messages = this.repository.findAll(ClaudeMessageDocument);
const tagged = this.repository.findByTag('important');
```

## Templates

Use `this.render()` to render Handlebars template files:

```typescript
const rendered = this.render(__dirname + '/templates/prompt.md', {
  subject: args.subject,
});
```

## Wait Transitions

Add `wait: true` to pause the workflow until externally triggered — by user input, a button click, or a sub-workflow callback.

```typescript
@Transition({
  from: 'waiting_for_user',
  to: 'ready',
  wait: true,
  schema: z.object({ message: z.string() }),
})
async userMessage(payload: { message: string }) {
  await this.repository.save(ClaudeMessageDocument, {
    role: 'user',
    content: payload.message,
  });
}
```

Use `schema` to validate and type the incoming payload.

## Guards (Conditional Routing)

When multiple transitions share the same `from` state, use `@Guard` to choose which one fires. Higher `priority` is checked first. A transition without a guard acts as the fallback.

```typescript
@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls() { ... }

@Final({ from: 'prompt_executed' })
async respond() { ... }  // Fallback — no guard

hasToolCalls() {
  return this.llmResult?.stop_reason === 'tool_use';
}
```

Guard methods must return `boolean | Promise<boolean>` and must exist on the class.

## Sub-Workflows

Inject a workflow with `@InjectWorkflow()` and launch it with `.run()`. The parent pauses at a wait transition until the sub-workflow completes and fires a callback.

```typescript
import { CallbackSchema, InjectWorkflow } from '@loopstack/common';
import { LinkDocument } from '@loopstack/core';

export class ParentWorkflow extends BaseWorkflow {
  @InjectWorkflow() private subWorkflow: SubWorkflow;

  @Initial({ to: 'sub_workflow_started' })
  async start() {
    const result = await this.subWorkflow.run(
      { topic: 'coffee' }, // args passed to sub-workflow
      {
        alias: 'my-sub', // optional display name
        callback: { transition: 'onSubComplete' }, // callback transition name
      },
    );

    // Embed the sub-workflow in the UI
    await this.repository.save(LinkDocument, {
      label: 'Processing...',
      workflowId: result.workflowId,
    });
  }

  @Transition({
    from: 'sub_workflow_started',
    to: 'done',
    wait: true,
    schema: CallbackSchema, // { workflowId, status, data }
  })
  async onSubComplete(payload: { workflowId: string; status: string; data: unknown }) {
    // payload.data contains the sub-workflow's @Final return value
  }
}
```

**`CallbackSchema`** is the base schema for sub-workflow callbacks (`{ workflowId, status, data }`). Extend it for typed payloads:

```typescript
const MyCallbackSchema = CallbackSchema.extend({
  data: z.object({ message: z.string() }),
});
```

## Places (States)

Places are implicit — defined by `from`/`to` values in your decorators. Two special places:

- **`start`** — Implicit initial place (the `@Initial` method transitions from here)
- **`end`** — When reached, the workflow completes

All other place names are arbitrary strings you choose.

## YAML Configuration

`.ui.yaml` files define **UI layout only** — no transitions, conditions, or tool calls. They configure what widgets appear in the Studio interface.

```yaml
title: 'My Workflow'
description: 'What this workflow does'

ui:
  form:
    properties:
      name:
        title: Name
      mode:
        title: Mode
        widget: select
        enumOptions:
          - label: 'Fast'
            value: fast
          - label: 'Detailed'
            value: detailed
      notes:
        title: Notes
        widget: textarea
        placeholder: 'Enter notes...'
        rows: 5

  widgets:
    - widget: form
      enabledWhen: [waiting]
      options:
        properties:
          name:
            title: Name
        actions:
          - type: button
            transition: userResponse
            label: Submit
    - widget: prompt-input
      enabledWhen: [waiting_for_user]
      options:
        transition: userMessage
    - widget: button
      enabledWhen: [confirm_step]
      options:
        transition: confirm
        label: 'Confirm'
        variant: primary
```

The `transition` values must match **method names** of `wait: true` transitions.

### `enabledWhen`

Controls when a widget is visible based on the current workflow place:

```yaml
- widget: prompt-input
  enabledWhen:
    - waiting_for_user # Only show at this place
  options:
    transition: userMessage
```

### Form Properties

Define input fields in `ui.form.properties`:

| Property      | Description                               |
| ------------- | ----------------------------------------- |
| `title`       | Field label                               |
| `widget`      | Widget type: `text`, `textarea`, `select` |
| `placeholder` | Placeholder text                          |
| `rows`        | Textarea rows                             |
| `collapsed`   | Start collapsed (default: false)          |
| `enumOptions` | Array of `{ label, value }` for selects   |

### Form Actions

Buttons that trigger `wait: true` transitions when clicked:

```yaml
actions:
  - type: button
    transition: confirm # Must match the method name
    label: 'Confirm'
```

### Widget Types

| Widget         | Description                             |
| -------------- | --------------------------------------- |
| `prompt-input` | Text input for user messages            |
| `button`       | Trigger a transition on click           |
| `form`         | Display form fields with submit actions |

## Module Registration

```typescript
@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [ChatWorkflow],
  exports: [ChatWorkflow],
})
export class ChatModule {}
```

## Workspace Registration

Make workflows visible in the Studio UI:

```typescript
@Workspace({ config: { title: 'My Workspace' } })
export class DefaultWorkspace implements WorkspaceInterface {
  @InjectWorkflow() chatWorkflow: ChatWorkflow;
}
```
