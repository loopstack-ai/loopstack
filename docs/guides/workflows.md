# Creating Workflows

A workflow is a **state machine** defined as a TypeScript class. It extends `BaseWorkflow` and uses decorators to define transitions between states.

## Chat Example

A simple chat workflow: wait for a user message, call LLM, display the response, and loop back.

```typescript
import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, TEMPLATE_RENDERER, Transition, Workflow } from '@loopstack/common';
import type { TemplateRenderFn } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({
  widget: __dirname + '/chat.ui.yaml', // UI config
})
export class ChatWorkflow extends BaseWorkflow {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  // 1. Entry point
  @Transition({ to: 'waiting_for_user' })
  async setup(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    return state;
  }

  // 2. Wait for user message
  @Transition({
    from: 'waiting_for_user',
    to: 'ready',
    wait: true,
    schema: z.string(),
  })
  async userMessage(state: Record<string, unknown>, payload: string): Promise<Record<string, unknown>> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', content: payload });
    return state;
  }

  // 3. Call LLM and loop back
  @Transition({
    from: 'ready',
    to: 'waiting_for_user',
  })
  async llmTurn(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.llmGenerateText.call({}, { config: { provider: 'claude', model: 'claude-sonnet-4-6' } });
    await this.documentStore.save(LlmMessageDocument, result.data!.message, {
      meta: { response: result.data!.response, provider: (result.metadata as { provider: string })?.provider },
    });
    return state;
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
  widget: __dirname + '/chat.ui.yaml',  // UI-only YAML config
})
```

- **`widget`** — Path to YAML file containing UI widget configuration (optional)
- **`schema`** — Zod schema that validates workflow input arguments (optional):

```typescript
@Workflow({
  widget: __dirname + '/prompt.ui.yaml',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
```

## `BaseWorkflow`

All workflows extend `BaseWorkflow`, which provides:

| Property / Method    | Description                                                                         |
| -------------------- | ----------------------------------------------------------------------------------- |
| `this.documentStore` | Save and query documents via `this.documentStore.save(DocClass, content, options?)` |

Context is passed as a parameter to transition methods via `ctx: LoopstackContext`:

| Context Property  | Description               |
| ----------------- | ------------------------- |
| `ctx.userId`      | User ID                   |
| `ctx.workspaceId` | Workspace ID              |
| `ctx.workflowId`  | Current workflow run ID   |
| `ctx.args`        | Validated input arguments |

## Transition Types

### Initial Transition — Entry Point

Runs once when the workflow starts. Uses `@Transition` with no `from` (defaults to `'start'`):

```typescript
@Transition({ to: 'ready' })
async setup(state: MyState, ctx: LoopstackContext): Promise<MyState> {
  const args = ctx.args as { subject: string };
  return state;
}
```

### Standard Transition — State Change

Moves between states. Fires automatically unless `wait: true` is set.

```typescript
@Transition({ from: 'ready', to: 'processed' })
async doWork(state: MyState): Promise<MyState> {
  const result = await this.myTool.call({ query: 'hello' });
  return { ...state, data: result.data };
}
```

A method can listen on **multiple source states**:

```typescript
@Transition({ from: 'ready', to: 'prompt_executed' })
@Transition({ from: 'tools_done', to: 'prompt_executed' })
async llmTurn(state: MyState): Promise<MyState> { ... }
```

### Final Transition — Completion

Uses `@Transition` with `to: 'end'`. The return value is the workflow's output (passed to parent workflow callbacks).

```typescript
@Transition({ from: 'done', to: 'end' })
async finish(state: MyState): Promise<{ concept: string }> {
  return { concept: state.confirmedConcept! };
}
```

## State

State is managed through a typed state interface passed as a parameter and returned from transitions:

```typescript
interface MyState {
  counter: number;
  llmResult?: LlmGenerateTextResult;
}

export class MyWorkflow extends BaseWorkflow<Record<string, unknown>, MyState> {
  @Transition({ from: 'ready', to: 'processed' })
  async process(state: MyState): Promise<MyState> {
    return { ...state, counter: (state.counter ?? 0) + 1 };
  }
}
```

Values persist even when the workflow pauses and resumes.

## Injecting Tools

Tools are injected via standard NestJS constructor injection:

```typescript
constructor(
  private readonly llmGenerateText: LlmGenerateTextTool,
) { super(); }

@Transition({ from: 'ready', to: 'done' })
async process(state: MyState): Promise<MyState> {
  const result = await this.llmGenerateText.call(
    { prompt: 'Write a haiku' },
    { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
  );
  return { ...state, llmResult: result.data };
}
```

## Documents

Use `this.documentStore.save()` to create or update documents. Reference document classes directly — no injection needed.

```typescript
// Create a document
await this.documentStore.save(LlmMessageDocument, {
  role: 'user',
  content: 'Hello!',
});

// Update an existing document by ID
await this.documentStore.save(
  LlmMessageDocument,
  { role: 'assistant', content: 'Updated response' },
  { id: 'response-1' },
);

// Hidden document (not shown in UI)
await this.documentStore.save(
  LlmMessageDocument,
  { role: 'user', content: 'System prompt' },
  { meta: { hidden: true } },
);
```

## Templates

Use `this.render()` to render Handlebars template files (inject via `@Inject(TEMPLATE_RENDERER)`):

```typescript
constructor(
  @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
) { super(); }

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
async userMessage(state: MyState, payload: { message: string }): Promise<MyState> {
  await this.documentStore.save(LlmMessageDocument, {
    role: 'user',
    content: payload.message,
  });
  return state;
}
```

Use `schema` to validate and type the incoming payload.

## Guards (Conditional Routing)

When multiple transitions share the same `from` state, use `@Guard` to choose which one fires. Higher `priority` is checked first. A transition without a guard acts as the fallback.

```typescript
@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: MyState): Promise<MyState> { ... }

@Transition({ from: 'prompt_executed', to: 'end' })
async respond(state: MyState): Promise<unknown> { ... }  // Fallback — no guard

hasToolCalls(state: MyState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

## Places (States)

Places are implicit — defined by `from`/`to` values in your decorators. Two special places:

- **`start`** — Implicit initial place (the initial transition moves from here when `from` is omitted)
- **`end`** — When reached, the workflow completes

All other place names are arbitrary strings you choose.

## YAML Configuration

YAML files define **UI layout only** — no transitions, conditions, or tool calls. They configure what widgets appear in the Studio interface.

```yaml
title: 'My Workflow'
description: 'What this workflow does'

ui:
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

### Form Actions

Buttons that trigger `wait: true` transitions when clicked:

```yaml
actions:
  - type: button
    transition: confirm # Must match the method name
    label: 'Confirm'
```

## Module Registration

```typescript
@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [ChatWorkflow],
  exports: [ChatWorkflow],
})
export class ChatModule {}
```

## File Structure

```
src/
├── workflows/
│   ├── chat.workflow.ts
│   ├── chat.ui.yaml
│   └── templates/
│       └── systemMessage.md
├── chat.module.ts
└── index.ts
```

## Registry References

- [chat-example-workflow](https://loopstack.ai/registry/loopstack-chat-example-workflow) — Multi-turn chat workflow (the minimal example on this page)
- [prompt-example-workflow](https://loopstack.ai/registry/loopstack-prompt-example-workflow) — Simple single-turn prompt workflow
- [tool-call-example-workflow](https://loopstack.ai/registry/loopstack-tool-call-example-workflow) — Tool calling loop with guards and conditional routing
- [dynamic-routing-example-workflow](https://loopstack.ai/registry/loopstack-dynamic-routing-example-workflow) — Multi-level guard-based routing
- [workflow-state-example-workflow](https://loopstack.ai/registry/loopstack-workflow-state-example-workflow) — State management with typed state interface
- [run-sub-workflow-example](https://loopstack.ai/registry/loopstack-run-sub-workflow-example) — Sub-workflow execution with callbacks
