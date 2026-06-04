# Skill: Create a Custom Workflow

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
import type { LoopstackContext } from '@loopstack/common';

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
  widget: __dirname + '/my.ui.yaml',
})
export class MyWorkflow extends BaseWorkflow<MyArgs, MyState> {
  // --- Tool & sub-workflow injection via constructor ---
  constructor(
    private readonly myTool: MyTool,
    private readonly helperWorkflow: HelperWorkflow,
  ) {
    super();
  }

  // --- Initial transition (workflow entry point, from defaults to 'start') ---
  @Transition({ to: 'ready' })
  async setup(state: MyState, ctx: LoopstackContext): Promise<MyState> {
    const args = ctx.args as MyArgs;
    return { ...state, message: `Hello, ${args.name}!` };
  }

  // --- Regular transition ---
  @Transition({ from: 'ready', to: 'processed' })
  async process(state: MyState): Promise<MyState> {
    const result = await this.myTool.call({ query: state.message! });
    return { ...state, total: result.data };
  }

  // --- Final transition (to: 'end' completes the workflow) ---
  @Transition({ from: 'processed', to: 'end' })
  async finish(state: MyState): Promise<MyState> {
    return state;
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
  widget: __dirname + '/my.ui.yaml',  // UI-only YAML config
  schema: z.object({                         // Input validation schema
    prompt: z.string(),
  }),
})
```

- `widget` — path to YAML file containing UI widget configuration
- `schema` — Zod schema that validates workflow input arguments

### `extends BaseWorkflow`

All workflows must extend `BaseWorkflow<TArgs, TState>`. It provides:

- `this.documentStore` — auto-injected, for saving and querying documents
- `ctx.args` — the validated workflow input arguments (via the `ctx` parameter on transitions)

### Constructor Injection

Tools and sub-workflows are injected via standard NestJS constructor injection:

```typescript
constructor(
  private readonly llmGenerateText: LlmGenerateTextTool,
  private readonly subWorkflow: SubWorkflow,
  @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
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
async setup(state: MyState, ctx: LoopstackContext): Promise<MyState> { ... }

// Regular transition
@Transition({ from: 'ready', to: 'processed' })
async doWork(state: MyState): Promise<MyState> { ... }

// Final transition (to: 'end' completes the workflow)
@Transition({ from: 'done', to: 'end' })
async finish(state: MyState): Promise<MyState> { ... }

// Wait for external callback
@Transition({
  from: 'waiting',
  to: 'ready',
  wait: true,
  schema: z.object({ message: z.string() }),
})
async onCallback(state: MyState, payload: { message: string }): Promise<MyState> { ... }

// Multiple source places
@Transition({ from: 'ready', to: 'prompt_executed' })
@Transition({ from: 'tools_done', to: 'prompt_executed' })
async llmTurn(state: MyState): Promise<MyState> { ... }
```

Options:

- `from` — source place (defaults to `'start'` if omitted — making it the initial transition)
- `to` — target place (use `'end'` for final transitions)
- `wait` — if `true`, workflow pauses until externally triggered
- `schema` — Zod schema to validate the callback payload (used with `wait: true`)
- `priority` — evaluation order when multiple transitions share the same `from` (higher = checked first)

### `@Guard('methodName')`

Conditional routing. The referenced method must return a boolean. Use with `priority` to control evaluation order.

```typescript
@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: MyState): Promise<MyState> { ... }

// Fallback — no guard, lower/no priority
@Transition({ from: 'prompt_executed', to: 'end' })
async respond(state: MyState): Promise<unknown> { ... }

hasToolCalls(state: MyState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

## State Management

State is managed through a typed interface, passed as the first parameter to transitions and returned from each one. State is automatically persisted across transitions.

```typescript
interface MyState {
  llmResult?: LlmGenerateTextResult;
  confirmedConcept?: string | null;
  counter: number;
}

export class MyWorkflow extends BaseWorkflow<MyArgs, MyState> {
  @Transition({ from: 'ready', to: 'processed' })
  async process(state: MyState): Promise<MyState> {
    const result = await this.myTool.call({ ... });
    return { ...state, llmResult: result.data, counter: state.counter + 1 };
  }
}
```

## Documents

Documents are referenced by class — no injection needed. Use `this.documentStore.save()` to create/update documents. `documentStore` is auto-injected on `BaseWorkflow`.

```typescript
import { LinkDocument } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider-module';

// Save a new document
await this.documentStore.save(LlmMessageDocument, {
  role: 'user',
  content: 'Hello!',
});

// Save with options (id for updates, meta for visibility)
await this.documentStore.save(
  LlmMessageDocument,
  { role: 'assistant', content: 'Hi!' },
  { id: 'greeting', meta: { hidden: true } },
);
```

## Handlebars Templates

Inject `TEMPLATE_RENDERER` and use `this.render()` to render Handlebars template files:

```typescript
import { Inject } from '@nestjs/common';
import { TEMPLATE_RENDERER } from '@loopstack/common';
import type { TemplateRenderFn } from '@loopstack/common';

constructor(
  @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
) { super(); }

const rendered = this.render(__dirname + '/templates/prompt.md', {
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
async routeHigh(state: MyState): Promise<MyState> { return state; }

@Transition({ from: 'check', to: 'low' })
async routeLow(state: MyState): Promise<MyState> { return state; }  // fallback — no guard

isHigh(state: MyState): boolean {
  return state.value > 100;
}
```

## Async Callbacks (Wait Transitions)

Use `wait: true` to pause the workflow until an external trigger (user input, sub-workflow callback, API call).

```typescript
@Transition({ from: 'responded', to: 'waiting_for_user' })
async waitForUser(state: MyState): Promise<MyState> {
  return state; // No-op — framework pauses here
}

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

Best practice: add a `schema` to validate the callback payload and receive it as a typed method parameter.

## Sub-Workflows

Inject sub-workflows via the constructor and use `.run()` to execute them asynchronously.

```typescript
constructor(private readonly subWorkflow: SubWorkflow) { super(); }

@Transition({ to: 'sub_started' })
async start(state: MyState): Promise<MyState> {
  const result: QueueResult = await this.subWorkflow.run(
    { prompt: 'Hello' },                                    // args
    { alias: 'subWorkflow', callback: { transition: 'onSubComplete' } },  // options
  );

  // Track the sub-workflow with a link document
  await this.documentStore.save(LinkDocument, {
    label: 'Running sub-workflow...',
    workflowId: result.workflowId,
  }, { id: `link_${result.workflowId}` });
  return state;
}

@Transition({
  from: 'sub_started',
  to: 'sub_done',
  wait: true,
  schema: CallbackSchema.extend({ data: z.object({ message: z.string() }) }),
})
async onSubComplete(state: MyState, payload: { workflowId: string; data: { message: string } }): Promise<MyState> {
  // payload.data contains the sub-workflow's final transition return value
  return state;
}
```

## Workflow Output

The return value from the final transition (`to: 'end'`) is the workflow's output. This is automatically passed to the parent workflow's callback when used as a sub-workflow.

```typescript
@Transition({ from: 'done', to: 'end' })
async finish(state: MyState): Promise<{ concept: string }> {
  return { concept: state.confirmedConcept! };
}
```

## Module Registration

```typescript
@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [
    MyWorkflow,
    MyTool,
    // Documents are NOT listed as providers — they are plain DTOs
  ],
  exports: [MyWorkflow, MyTool],
})
export class MyFeatureModule {}
```

## Complete Examples

### Example 1: Simple prompt workflow

```typescript
import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, TEMPLATE_RENDERER, Transition, Workflow } from '@loopstack/common';
import type { LoopstackContext, TemplateRenderFn } from '@loopstack/common';
import type { LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

interface PromptState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
}

@Workflow({
  widget: __dirname + '/prompt.ui.yaml',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow<{ subject: string }, PromptState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'prompt_executed' })
  async prompt(state: PromptState, ctx: LoopstackContext): Promise<PromptState> {
    const args = ctx.args as { subject: string };
    const result = await this.llmGenerateText.call(
      {
        prompt: this.render(__dirname + '/templates/prompt.md', { subject: args.subject }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );
    return { llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: PromptState): Promise<unknown> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return {};
  }
}
```

### Example 2: Stateful workflow with dynamic routing

```typescript
interface RoutingState {
  value: number;
}

@Workflow({
  widget: __dirname + '/routing.ui.yaml',
  schema: z.object({ value: z.number().default(150) }).strict(),
})
export class RoutingWorkflow extends BaseWorkflow<{ value: number }, RoutingState> {
  @Transition({ to: 'prepared' })
  async setup(state: RoutingState, ctx: LoopstackContext): Promise<RoutingState> {
    const args = ctx.args as { value: number };
    return { ...state, value: args.value };
  }

  @Transition({ from: 'prepared', to: 'high', priority: 10 })
  @Guard('isAbove200')
  async routeHigh(state: RoutingState): Promise<RoutingState> {
    return state;
  }

  @Transition({ from: 'prepared', to: 'medium', priority: 5 })
  @Guard('isAbove100')
  async routeMedium(state: RoutingState): Promise<RoutingState> {
    return state;
  }

  @Transition({ from: 'prepared', to: 'low' })
  async routeLow(state: RoutingState): Promise<RoutingState> {
    return state;
  }

  isAbove200(state: RoutingState): boolean {
    return state.value > 200;
  }
  isAbove100(state: RoutingState): boolean {
    return state.value > 100;
  }

  @Transition({ from: 'high', to: 'end' })
  async showHigh(state: RoutingState): Promise<unknown> {
    return {};
  }

  @Transition({ from: 'medium', to: 'end' })
  async showMedium(state: RoutingState): Promise<unknown> {
    return {};
  }

  @Transition({ from: 'low', to: 'end' })
  async showLow(state: RoutingState): Promise<unknown> {
    return {};
  }
}
```

### Example 3: Chat loop with tool calling

```typescript
interface ChatState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  widget: __dirname + '/chat.ui.yaml',
  schema: z.object({ prompt: z.string() }),
})
export class ChatWorkflow extends BaseWorkflow<{ prompt: string }, ChatState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly getWeather: GetWeather,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: ChatState, ctx: LoopstackContext): Promise<ChatState> {
    const args = ctx.args as { prompt: string };
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      content: args.prompt,
    });
    return state;
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  @Transition({ from: 'tools_done', to: 'prompt_executed' })
  async llmTurn(state: ChatState): Promise<ChatState> {
    const result = await this.llmGenerateText.call(
      {},
      { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
    );
    return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: ChatState): Promise<ChatState> {
    const result = await this.llmDelegateToolCalls.call(
      { message: state.llmResult!.message },
      { config: { provider: 'claude' } },
    );
    return { ...state, delegateResult: result.data };
  }

  hasToolCalls(state: ChatState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'tools_done' })
  @Guard('allToolsComplete')
  async toolsComplete(state: ChatState): Promise<ChatState> {
    return state;
  }

  allToolsComplete(state: ChatState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: ChatState): Promise<unknown> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return {};
  }
}
```

## Workflow Lifecycle

1. Workflow starts — initial transition (from `'start'`) fires, args available via `ctx.args`
2. Transitions fire automatically in sequence
3. Tool calls execute via `await this.tool.call(args)` in transition methods
4. State is the return value of each transition, passed to the next
5. If a transition targets `'end'`, workflow completes and returns its state
6. If a `wait: true` transition is reached, workflow pauses until externally triggered
7. `@Guard` methods control routing when multiple transitions share a `from` place
8. On error, the workflow fails (or use try/catch in method bodies)

## Checklist

1. Extend `BaseWorkflow<TArgs, TState>` and add `@Workflow({ widget, schema? })`
2. Inject tools and sub-workflows via constructor — call via `await this.tool.call(args)`
3. Define `@Transition({ to })` method for workflow entry (from defaults to `'start'`) — access args via `ctx.args`
4. Define `@Transition({ from, to })` methods for intermediate steps
5. Define `@Transition({ from, to: 'end' })` method for completion
6. Use `wait: true` + `schema` for callback/user-input transitions
7. Use `@Guard('methodName')` + `priority` for conditional routing
8. State is passed as the first parameter and returned from each transition
9. Write YAML config with UI widgets only (no transitions)
10. Register workflow as provider and export in a NestJS `@Module()`
