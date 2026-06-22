---
title: Creating Workflows
description: How to define workflow state machines using BaseWorkflow, @Workflow() decorator, @Transition() decorator, state typing, wait transitions, and guards. Includes full chat workflow example.
---

# Creating Workflows

A workflow is a state machine defined as a TypeScript class. Define transitions between named states, add guards for conditional routing, and use wait transitions to pause for user input or external events.

## Chat Example

A simple chat workflow: wait for a user message, call LLM, display the response, and loop back.

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({
  widget: __dirname + '/chat.ui.yaml', // UI config
})
export class ChatWorkflow extends BaseWorkflow {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
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
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: payload });
    return state;
  }

  // 3. Call LLM and loop back
  @Transition({
    from: 'ready',
    to: 'waiting_for_user',
  })
  async llmTurn(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.llmGenerateText.call({}, { config: { provider: 'claude', model: 'claude-sonnet-4-6' } });
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
  widget: __dirname + '/chat.ui.yaml',
})
```

All options are optional.

| Option         | Type                       | Default                                                 | Description                                                                                                                    |
| -------------- | -------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `name`         | `string`                   | class name with `Workflow` suffix stripped, snake_cased | Explicit snake_case identifier. E.g. `ChatWorkflow` → `chat`, `AgentExampleWorkflow` → `agent_example`.                        |
| `title`        | `string`                   | —                                                       | Human-readable display title shown in Studio UI.                                                                               |
| `description`  | `string`                   | —                                                       | Human-readable description shown in Studio UI.                                                                                 |
| `widget`       | `WidgetRef \| WidgetRef[]` | —                                                       | Path(s) to YAML file(s) — or inline widget object(s) — defining the Studio UI surface for this workflow.                       |
| `schema`       | `z.ZodType`                | —                                                       | Zod schema validating workflow input arguments. Surfaces as `ctx.args` in transitions.                                         |
| `configSchema` | `z.ZodType`                | —                                                       | Zod schema validating workflow config (provided via `options.config` at start time / sub-workflow `run()`).                    |
| `stateSchema`  | `z.ZodType`                | —                                                       | Zod schema validating the resulting state after every transition (see [Validating State](#validating-state-with-stateschema)). |

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
| `this.render`        | Render Handlebars templates via `this.render(templatePath, data?)`                  |

Context is passed as a parameter to transition methods via `ctx: RunContext<TArgs>`. The generic parameter types `ctx.args` — prefer it over casting:

| Context Property            | Description                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `ctx.userId`                | User ID                                                                                    |
| `ctx.workspaceId`           | Workspace ID                                                                               |
| `ctx.workflowId`            | Current workflow run ID                                                                    |
| `ctx.args`                  | Validated input arguments (typed via `RunContext<TArgs>`)                                  |
| `ctx.execution?.place`      | Current state name. Present in workflow transitions, absent when `ctx` is passed to tools. |
| `ctx.execution?.retryCount` | Retry attempt counter for the current transition (0 on first run).                         |

```typescript
@Transition({ to: 'ready', schema: z.object({ subject: z.string() }) })
async setup(state: MyState, ctx: RunContext<{ subject: string }>): Promise<MyState> {
  return { ...state, subject: ctx.args.subject };
}
```

## Transition Types

### Initial Transition — Entry Point

Runs once when the workflow starts. Uses `@Transition` with no `from` (defaults to `'start'`):

```typescript
@Transition({ to: 'ready' })
async setup(state: MyState, ctx: RunContext<{ subject: string }>): Promise<MyState> {
  return { ...state, subject: ctx.args.subject };
}
```

The `state` parameter starts as an empty object `{}` — the initial transition is the place to populate it.

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

### Wait Transition — Pause for Input

Add `wait: true` to pause the workflow until externally triggered — by user input, a button click, or a sub-workflow callback. Use `schema` to validate and type the incoming payload.

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
    text: payload.message,
  });
  return state;
}
```

For approval gates, confirmation dialogs, and other interactive pauses built on top of `wait: true`, see [Human-in-the-Loop](../patterns/human-in-the-loop.md).

### Final Transition — Completion

Uses `@Transition` with `to: 'end'`. The return value is the workflow's output (passed to parent workflow callbacks).

```typescript
@Transition({ from: 'done', to: 'end' })
async finish(state: MyState): Promise<{ concept: string }> {
  return { concept: state.confirmedConcept! };
}
```

## Guarding Transitions

When multiple transitions share the same `from` state, attach `@Guard('methodName')` to pick which one fires:

- Higher `priority` is checked first. Transitions without `priority` are evaluated last, in declaration order.
- A guard is a boolean method on the workflow that receives the current `state` and returns `true` to allow the transition.
- A transition without a guard always passes — use it as the fallback.

```typescript
@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: MyState): Promise<MyState> {
  const result = await this.llmDelegateToolCalls.call({ message: state.llmResult!.message });
  return { ...state, delegateResult: result.data };
}

@Transition({ from: 'prompt_executed', to: 'end' })
async respond(_state: MyState): Promise<unknown> {
  return {};
}

hasToolCalls(state: MyState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

From `prompt_executed`, `executeToolCalls` fires whenever the LLM requested tools; otherwise `respond` (unguarded) ends the workflow.

## State

State is managed through a typed state interface passed as a parameter and returned from transitions:

```typescript
interface MyState {
  counter: number;
  llmResult?: LlmGenerateTextResult;
}

export class MyWorkflow extends BaseWorkflow {
  @Transition({ from: 'ready', to: 'processed' })
  async process(state: MyState): Promise<MyState> {
    return { ...state, counter: (state.counter ?? 0) + 1 };
  }
}
```

Values persist even when the workflow pauses and resumes.

### Validating State with `stateSchema`

Add a Zod schema via `@Workflow({ stateSchema })` to enforce the state shape at runtime. The processor validates the resulting state after every transition (before persistence). If validation fails the transition errors out — bugs that corrupt state are caught at the point they occur instead of leaking into later transitions or checkpoints.

```typescript
const MyStateSchema = z.object({
  counter: z.number().int().nonnegative(),
  llmResult: z.unknown().optional(),
});

@Workflow({
  stateSchema: MyStateSchema,
})
export class MyWorkflow extends BaseWorkflow {
  @Transition({ from: 'ready', to: 'processed' })
  async process(state: z.infer<typeof MyStateSchema>) {
    return { ...state, counter: (state.counter ?? 0) + 1 };
  }
}
```

Use this when the state shape is critical and you want fail-fast diagnostics. Skip it for prototyping or when the state is loose by design.

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
  text: 'Hello!',
});

// Update an existing document by ID
await this.documentStore.save(
  LlmMessageDocument,
  { role: 'assistant', text: 'Updated response' },
  { id: 'response-1' },
);

// Hidden document (not shown in UI)
await this.documentStore.save(LlmMessageDocument, { role: 'user', text: 'System prompt' }, { meta: { hidden: true } });
```

## Templates

`render` is available directly on `BaseWorkflow` (like `documentStore`). Use `this.render()` to render Handlebars template files:

```typescript
const rendered = this.render(__dirname + '/templates/prompt.md', {
  subject: args.subject,
});
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
  imports: [ClaudeModule],
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

---

> **Using an AI coding agent?** See [Skill: Create a Custom Workflow](../../skills/create-custom-workflow.md) for a dense checklist and syntax reference optimized for code generation.
