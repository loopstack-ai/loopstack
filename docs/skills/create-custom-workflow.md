---
title: 'Skill: Create a Custom Workflow'
description: Step-by-step instructions for AI agents to scaffold a new workflow — file structure, TypeScript class with @Workflow and @Transition decorators, YAML widget config, and module registration.
---

# Skill: Create a Custom Workflow

> **For AI coding agents:** This page is a dense reference checklist optimized for tools like Claude Code scaffolding Loopstack code. For the human-readable guide, see [Creating Workflows](../build/fundamentals/workflows.md). For design judgment — scripted vs agentic, where logic belongs, state vs result vs documents — read [Best Practices](../build/best-practices.md) before scaffolding.

## Workflow Anatomy

A workflow is a **state machine** defined by two files:

1. **TypeScript class** — extends `BaseWorkflow`, decorated with `@Workflow()`, contains transition logic, state, guards, and tool calls
2. **YAML config** — UI-only configuration (widgets, forms, enabled states)

```
src/
├── workflows/
│   ├── my.workflow.ts        # class definition
│   └── my.ui.yaml      # UI config only
├── my-feature.module.ts
└── index.ts
```

## TypeScript Class

```typescript
import { z } from 'zod';
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const MyArgs = z.object({
  name: z.string().default('world'),
  count: z.number().default(1),
});
type MyArgs = z.infer<typeof MyArgs>;

interface MyState {
  total?: number;
  message?: string;
}

@Workflow({
  schema: MyArgs,
  widget: './my.ui.yaml',
})
export class MyWorkflow extends BaseWorkflow<MyArgs> {
  // --- Tool & sub-workflow injection via constructor ---
  constructor(
    private readonly myTool: MyTool,
    private readonly helperWorkflow: HelperWorkflow,
  ) {
    super();
  }

  // --- Initial transition (workflow entry point, from defaults to 'start') ---
  @Transition({ to: 'ready' })
  setup(state: MyState, ctx: RunContext<MyArgs>) {
    this.assignState({ message: `Hello, ${ctx.args.name}!` });
  }

  // --- Regular transition ---
  @Transition({ from: 'ready', to: 'processed' })
  async process(state: MyState) {
    const result = await this.myTool.call({ query: state.message! });
    this.assignState({ total: result.data });
  }

  // --- Final transition (to: 'end' completes the workflow) ---
  @Transition({ from: 'processed', to: 'end' })
  finish(state: MyState) {
    this.setResult({ total: state.total });
  }

  // --- Regular helper method ---
  private formatMessage(text: string): string {
    return text.toUpperCase();
  }
}
```

## Decorators Reference

### `@Workflow(options?)`

Class decorator. Configures the workflow.

```typescript
@Workflow({
  widget: './my.ui.yaml',  // UI-only YAML config
  schema: z.object({                         // Input validation schema
    prompt: z.string(),
  }),
})
```

- `widget` — path to YAML file containing UI widget configuration
- `schema` — Zod schema that validates workflow input arguments
- `name`, `title`, `description`, `configSchema`, `stateSchema` — less common; see the [`@Workflow` reference table](../build/fundamentals/workflows.md#the-workflow-decorator)

### `extends BaseWorkflow`

All workflows must extend `BaseWorkflow<TArgs>` (or just `BaseWorkflow` for no input). State is typed per-transition on the `state` parameter. It provides:

- `this.documentStore` — auto-injected, for saving and querying documents
- `ctx.args` — the validated workflow input arguments (via the `ctx` parameter on transitions)

### Constructor Injection

Tools and sub-workflows are injected via standard NestJS constructor injection:

```typescript
constructor(
  private readonly llmGenerateText: LlmGenerateTextTool,
  private readonly subWorkflow: SubWorkflow,
) { super(); }

// Usage:
const result = await this.llmGenerateText.call(
  { prompt: 'Hello' },
  { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
);
await this.subWorkflow.run(args, { callback: { transition: 'onComplete' } });
```

### `@Transition(options)`

Defines a state transition. All transitions use this single decorator.

```typescript
// Initial transition (from defaults to 'start')
@Transition({ to: 'ready' })
async setup(state: MyState, ctx: RunContext) { ... }

// Regular transition
@Transition({ from: 'ready', to: 'processed' })
async doWork(state: MyState) { ... }

// Final transition (to: 'end' completes the workflow)
@Transition({ from: 'done', to: 'end' })
async finish(state: MyState) { ... }

// Wait for external callback
@Transition({
  from: 'waiting',
  to: 'ready',
  wait: true,
  schema: z.object({ message: z.string() }),
})
async onCallback(state: MyState, input: TransitionInput<{ message: string }>) { ... }

// Multiple source places
@Transition({ from: 'ready', to: 'prompt_executed' })
@Transition({ from: 'tools_done', to: 'prompt_executed' })
async llmTurn(state: MyState) { ... }
```

Options:

- `from` — source place (defaults to `'start'` if omitted — making it the initial transition)
- `to` — target place (use `'end'` for final transitions)
- `wait` — if `true`, workflow pauses until externally triggered
- `schema` — Zod schema that validates the `data` payload arriving on the resume (used with `wait: true`). The transition method receives the full `TransitionInput<TData>` envelope; `schema` describes only its `data` field.
- `priority` — evaluation order when multiple transitions share the same `from` (higher = checked first)

### `@Guard('methodName')`

Conditional routing. The referenced method must return a boolean. Use with `priority` to control evaluation order.

```typescript
@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: MyState) { ... }

// Fallback — no guard, lower/no priority
@Transition({ from: 'prompt_executed', to: 'end' })
async respond(state: MyState) { ... }

hasToolCalls(state: MyState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

## State Management

Transitions return nothing — mutate state via `this.assignState(...)`. Use `async` when the body awaits. Read state via the `state` parameter; write it through setters on `BaseWorkflow`:

| Setter                       | Effect                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `this.assignState(partial)`  | Shallow-merge `partial` into the current state. Most common.                                                      |
| `this.setState(full)`        | Replace state outright.                                                                                           |
| `this.assignResult(partial)` | Shallow-merge `partial` into the workflow's published `result` (returned to parent callbacks / `WorkflowRunner`). |
| `this.setResult(full)`       | Replace the published `result` outright.                                                                          |

Returning a value from a transition is a runtime error.

```typescript
interface MyState {
  llmResult?: LlmGenerateTextResult;
  confirmedConcept?: string | null;
  counter: number;
}

export class MyWorkflow extends BaseWorkflow<MyArgs> {
  @Transition({ from: 'ready', to: 'processed' })
  async process(state: MyState) {
    const result = await this.myTool.call({ ... });
    this.assignState({ llmResult: result.data, counter: state.counter + 1 });
  }
}
```

## Documents

Documents are referenced by class — no injection needed. Use `this.documentStore.save()` to create/update documents. `documentStore` is auto-injected on `BaseWorkflow`.

```typescript
import { LlmMessageDocument } from '@loopstack/llm-provider-module';

// Save a new document
await this.documentStore.save(LlmMessageDocument, {
  role: 'user',
  text: 'Hello!',
});

// Save with a stable upsert key — saving twice with the same key replaces the previous row in place
await this.documentStore.save(LlmMessageDocument, { role: 'assistant', text: 'Hi!' }, { key: 'greeting' });

// To hide a message from the UI (still picked up by the LLM as conversation history),
// use LlmContextDocument — its @Document decorator declares { internal: true, tags: ['message'] }
await this.documentStore.save(LlmContextDocument, { role: 'user', text: 'System prompt text' });
```

## Handlebars Templates

`render` is available directly on `BaseWorkflow` (like `documentStore`), so workflows just use `this.render(...)` without any injection:

```typescript
const rendered = this.render(join(__dirname, 'templates', 'prompt.md'), {
  subject: args.subject,
  items: state.items,
});
```

Template file (`templates/prompt.md`):

```markdown
Write a haiku about {{subject}}.

{{#each items}}

- {{this.name}}
  {{/each}}
```

## YAML Config — UI Only

YAML files contain only UI configuration. No `transitions:` section.

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
            title: 'Name'
          count:
            title: 'Count'
            widget: slider
        actions:
          - type: button
            transition: userResponse # Must match the method name
            label: Submit
    - widget: prompt-input
      enabledWhen: [waiting_for_user]
      options:
        transition: userMessage # Must match the method name
        label: Send Message
```

> **Important:** The `transition` value in widget options must match the **method name** of the `wait: true` transition, not an arbitrary ID.

## Places (States)

Places are implicit — defined by `from`/`to` values in transition decorators. Two special places:

- **`start`** — implicit initial place (transitions with no `from` default to `'start'`)
- **`end`** — when reached (via `to: 'end'`), workflow completes

All other place names are arbitrary strings.

## Conditional Routing / Guards

When multiple transitions share the same `from` place:

1. Transitions with `@Guard` and higher `priority` are checked first
2. First transition whose guard returns `true` fires
3. A transition without `@Guard` acts as the fallback

```typescript
@Transition({ from: 'check', to: 'high', priority: 10 })
@Guard('isHigh')
routeHigh(state: MyState) {}

@Transition({ from: 'check', to: 'low' })
routeLow(state: MyState) {}  // fallback — no guard

isHigh(state: MyState): boolean {
  return state.value > 100;
}
```

## Async Callbacks (Wait Transitions)

Use `wait: true` to pause the workflow until an external trigger (user input, sub-workflow callback, API call).

```typescript
import type { TransitionInput } from '@loopstack/common';

@Transition({ from: 'responded', to: 'waiting_for_user' })
waitForUser(state: MyState) {
  // Moves to waiting_for_user, where the wait transition pauses
}

@Transition({
  from: 'waiting_for_user',
  to: 'ready',
  wait: true,
  schema: z.object({ message: z.string() }),
})
async userMessage(state: MyState, input: TransitionInput<{ message: string }>) {
  await this.documentStore.save(LlmMessageDocument, {
    role: 'user',
    text: input.data.message,
  });
}
```

Best practice: add a `schema` (describing only `data`) and type the parameter with `TransitionInput<TData>` so `input.data` is fully typed alongside `input.hasError` / `input.errorMessage` / `input.status` for failure branches.

## Sub-Workflows

Inject sub-workflows via the constructor and use `.run()` to execute them asynchronously. The orchestrator automatically renders the child in the parent's run view based on the `show` option (default `'inline'`).

```typescript
constructor(private readonly subWorkflow: SubWorkflow) { super(); }

@Transition({ to: 'sub_started' })
async start(state: MyState) {
  await this.subWorkflow.run(
    { prompt: 'Hello' },                                                       // args
    { callback: { transition: 'onSubComplete' }, show: 'inline', label: 'Running sub-workflow...' },
  );
}

@Transition({
  from: 'sub_started',
  to: 'sub_done',
  wait: true,
  schema: z.object({ message: z.string() }),
})
onSubComplete(state: MyState, input: TransitionInput<{ message: string }>) {
  // input.data contains the sub-workflow's published result
  // input.hasError / input.errorMessage are populated if the child failed
}
```

`show` accepts `'inline'` (default — embed as iframe), `'link'` (status link card opening in a separate window), or `'hidden'` (no card). See [Sub-Workflows](../build/patterns/sub-workflows.md) for the full reference.

## Workflow Output

Publish the workflow's output via `this.assignResult(...)` or `this.setResult(...)` — that value is what `WorkflowRunner` callers receive and what flows into a parent workflow's callback when this workflow runs as a sub-workflow.

```typescript
@Transition({ from: 'done', to: 'end' })
finish(state: MyState) {
  this.setResult({ concept: state.confirmedConcept! });
}
```

## Module Registration

Every module whose workflows should appear in **Loopstack Studio** must be decorated with `@StudioApp`. Without it, workflows are NestJS providers but are not visible or launchable from the UI.

```typescript
import { StudioApp } from '@loopstack/common';

@StudioApp({
  title: 'My Feature',
  workflows: [MyWorkflow],
})
@Module({
  imports: [ClaudeModule],
  providers: [
    MyWorkflow,
    MyTool,
    // Documents are NOT listed as providers — they are plain DTOs
  ],
})
export class MyFeatureModule {}
```

> **Note:** `@StudioApp` is required alongside `@Module` — it does not replace it. If you are building a reusable library module (not a standalone app), omit `@StudioApp` and let the consuming app module declare the workflows.

## Complete Examples

### Example 1: Simple prompt workflow

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool } from '@loopstack/llm-provider-module';

const PromptSchema = z.object({
  subject: z.string().default('coffee'),
});
type PromptArgs = z.infer<typeof PromptSchema>;

@Workflow({
  widget: './prompt.ui.yaml',
  schema: PromptSchema,
})
export class PromptWorkflow extends BaseWorkflow<PromptArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'end' })
  async prompt(state: Record<string, unknown>, ctx: RunContext<PromptArgs>) {
    await this.llmGenerateText.call(
      {
        prompt: this.render(join(__dirname, 'templates', 'prompt.md'), { subject: ctx.args.subject }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );
  }
}
```

### Example 2: Stateful workflow with dynamic routing

```typescript
interface RoutingState {
  value: number;
}

const RoutingSchema = z.object({ value: z.number().default(150) }).strict();
type RoutingArgs = z.infer<typeof RoutingSchema>;

@Workflow({
  widget: './routing.ui.yaml',
  schema: RoutingSchema,
})
export class RoutingWorkflow extends BaseWorkflow<RoutingArgs> {
  @Transition({ to: 'prepared' })
  setup(state: RoutingState, ctx: RunContext<RoutingArgs>) {
    this.assignState({ value: ctx.args.value });
  }

  @Transition({ from: 'prepared', to: 'high', priority: 10 })
  @Guard('isAbove200')
  routeHigh(state: RoutingState) {}

  @Transition({ from: 'prepared', to: 'medium', priority: 5 })
  @Guard('isAbove100')
  routeMedium(state: RoutingState) {}

  @Transition({ from: 'prepared', to: 'low' })
  routeLow(state: RoutingState) {}

  isAbove200(state: RoutingState): boolean {
    return state.value > 200;
  }
  isAbove100(state: RoutingState): boolean {
    return state.value > 100;
  }

  @Transition({ from: 'high', to: 'end' })
  showHigh(state: RoutingState) {}

  @Transition({ from: 'medium', to: 'end' })
  showMedium(state: RoutingState) {}

  @Transition({ from: 'low', to: 'end' })
  showLow(state: RoutingState) {}
}
```

### Example 3: Chat loop with tool calling

```typescript
interface ChatState {
  llmResult?: LlmGenerateTextResult;
  delegateResult?: LlmDelegateResult;
}

const ChatSchema = z.object({ prompt: z.string() });
type ChatArgs = z.infer<typeof ChatSchema>;

@Workflow({
  widget: './chat.ui.yaml',
  schema: ChatSchema,
})
export class ChatWorkflow extends BaseWorkflow<ChatArgs> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    private readonly getWeather: GetWeather,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: ChatState, ctx: RunContext<ChatArgs>) {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      text: ctx.args.prompt,
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  @Transition({ from: 'tools_done', to: 'prompt_executed' })
  async llmTurn(state: ChatState) {
    const result = await this.llmGenerateText.call(
      {},
      { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
    );
    this.assignState({ llmResult: result.data });
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: ChatState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.assignState({ delegateResult: result.data });
  }

  hasToolCalls(state: ChatState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived(state: ChatState, payload: unknown) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: payload,
    });
    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'tools_done' })
  @Guard('allToolsComplete')
  toolsComplete(state: ChatState) {}

  allToolsComplete(state: ChatState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  respond(_state: ChatState) {}
}
```

## Workflow Lifecycle

1. Workflow starts — initial transition (from `'start'`) fires, args available via `ctx.args`
2. Transitions fire automatically in sequence — each writes state via `this.assignState(...)` / `this.setState(...)` (use `async` when the body awaits)
3. Tool calls execute via `await this.tool.call(args)` in transition methods
4. The published `result` (built via `this.assignResult(...)` / `this.setResult(...)`) is the workflow's output
5. If a transition targets `'end'`, workflow completes and exposes its published `result`
6. If a `wait: true` transition is reached, workflow pauses until externally triggered
7. `@Guard` methods control routing when multiple transitions share a `from` place
8. On error, the workflow fails (or use try/catch in method bodies)

## Checklist

1. Extend `BaseWorkflow<TArgs>` (or just `BaseWorkflow` for no input) and add `@Workflow({ widget, schema? })`
2. Inject tools and sub-workflows via constructor — call via `await this.tool.call(args)`
3. Define `@Transition({ to })` method for workflow entry (from defaults to `'start'`) — access args via `ctx.args`
4. Define `@Transition({ from, to })` methods for intermediate steps
5. Define `@Transition({ from, to: 'end' })` method for completion — publish output via `this.setResult(...)`
6. Use `wait: true` + `schema` for callback/user-input transitions
7. Use `@Guard('methodName')` + `priority` for conditional routing
8. Transitions return nothing — mutate state via `this.assignState(...)` / `this.setState(...)`. Use `async` when the body awaits.
9. Write YAML config with UI widgets only (no transitions)
10. Register workflow as provider in a NestJS `@Module()`
11. Add `@StudioApp({ title, workflows: [MyWorkflow] })` to the module so workflows appear in Studio
