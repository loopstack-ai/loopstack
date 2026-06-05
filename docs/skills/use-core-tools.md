# Skill: Use Core Tools

## Overview

Core tools and documents ship with the Loopstack framework itself (via `@loopstack/core` and `@loopstack/common`). They are available globally through `LoopstackModule.forRoot()` without installing any registry packages — no extra imports needed in feature modules. Document classes are imported from `@loopstack/common`.

## Sub-Workflow Execution

Inject sub-workflows via the constructor and use `.run()` to execute them asynchronously. The parent workflow pauses at a `wait: true` transition until the sub-workflow completes and triggers the callback.

### Inject in workflow

```typescript
import { CallbackSchema, QueueResult } from '@loopstack/common';

constructor(private readonly subWorkflow: SubWorkflow) { super(); }
```

### Run the sub-workflow

```typescript
const result: QueueResult = await this.subWorkflow.run(
  { prompt: 'Hello' }, // args passed to the sub-workflow
  {
    callback: {
      transition: 'onSubComplete', // method name of the wait transition
    },
  },
);
// result.workflowId — the ID of the spawned sub-workflow
```

### Receive the callback

```typescript
const SubWorkflowCallbackSchema = CallbackSchema.extend({
  data: z.object({ message: z.string() }),
});

type SubWorkflowCallback = z.infer<typeof SubWorkflowCallbackSchema>;

@Transition({
  from: 'sub_started',
  to: 'sub_done',
  wait: true,
  schema: SubWorkflowCallbackSchema,
})
async onSubComplete(state: MyState, payload: SubWorkflowCallback): Promise<MyState> {
  // payload.workflowId — the sub-workflow's ID
  // payload.status — the sub-workflow's completion status
  // payload.data — the sub-workflow's final transition return value
  const message = payload.data.message;
  return state;
}
```

### Sub-workflow output

The sub-workflow's final transition (`to: 'end'`) return value is passed as `payload.data` in the parent's callback:

```typescript
// In the sub-workflow:
@Transition({ from: 'done', to: 'end' })
async finish(state: SubState): Promise<{ message: string }> {
  return { message: 'Hi mom!' };
}
```

### Tracking with LinkDocument

Use `LinkDocument` to show a clickable link to the sub-workflow in the UI:

```typescript
import { LinkDocument } from '@loopstack/common';

await this.documentStore.save(
  LinkDocument,
  {
    label: 'Running sub-workflow...',
    workflowId: result.workflowId,
  },
  { id: `link_${result.workflowId}` },
);

// Update after completion
await this.documentStore.save(
  LinkDocument,
  {
    label: 'Sub-Workflow',
    status: 'success',
    workflowId: payload.workflowId,
  },
  { id: `link_${payload.workflowId}` },
);
```

## Built-in Document Types

These document types are available from `@loopstack/common` without additional imports:

| Document           | Description                     | Key Fields                                           |
| ------------------ | ------------------------------- | ---------------------------------------------------- |
| `MessageDocument`  | Simple chat message             | `role`, `content`                                    |
| `MarkdownDocument` | Rendered markdown               | `markdown`                                           |
| `PlainDocument`    | Plain text                      | `text`                                               |
| `ErrorDocument`    | Error message (red styling)     | `error`                                              |
| `LinkDocument`     | Clickable link to sub-workflows | `label`, `workflowId`, `status`, `embed`, `expanded` |

### Usage

```typescript
import { LinkDocument, MessageDocument } from '@loopstack/common';

// Save any built-in document
await this.documentStore.save(LinkDocument, {
  label: 'View Details',
  workflowId: result.workflowId,
});

await this.documentStore.save(MessageDocument, {
  role: 'assistant',
  content: 'Hello! How can I help?',
});
```

## Requirements

- The parent workflow must be **stateful** (the default). Sub-workflow execution requires state persistence.
- The target workflow must be registered as a provider in an imported module.
- The callback `transition` value must match the **method name** of a `wait: true` transition.
