---
title: State Management
description: Defining, reading, and updating typed workflow state. Covers state interfaces, BaseWorkflow generics, state persistence across transitions, and state access patterns.
---

# State Management

Workflow state is managed through a typed state interface and passed as the first parameter to transition methods. State is returned from each transition and automatically persisted across transitions.

## Defining State

Define a state interface and pass it as a generic to `BaseWorkflow`:

```typescript
interface MyState {
  counter?: number;
  llmResult?: LlmGenerateTextResult;
  items?: string[];
}

export class MyWorkflow extends BaseWorkflow<Record<string, unknown>, MyState> {
  // ...
}
```

State begins as an empty object `{}` — the initial transition is responsible for populating it. For this reason, **all properties on a state schema should be optional**. If a property is required, the empty starting state (or any transition that returns `{}` to reset) will fail validation immediately. Treat missing fields as the absence of data and read them defensively (`state.counter ?? 0`).

## Writing State

Return updated state from transition methods:

```typescript
@Transition({ from: 'ready', to: 'processed' })
async process(state: MyState): Promise<MyState> {
  const result = await this.llmGenerateText.call(
    {},
    { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
  );
  return {
    ...state,
    llmResult: result.data,
    counter: (state.counter ?? 0) + 1,
    items: [...(state.items ?? []), 'new item'],
  };
}
```

### Return value policy

| Return                         | Effect                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `return;` / `return undefined` | Previous state is preserved unchanged. Use this when the transition has no state to write.                                                           |
| `return { ... }`               | Object becomes the new state. Validated against `stateSchema` if defined.                                                                            |
| `return {}`                    | State is reset to an empty object (validated against `stateSchema` if defined).                                                                      |
| `return null` / primitive      | The returned value becomes the new state. If `stateSchema` is defined, the transition throws — `null` and primitives don't satisfy an object schema. |

Returning a new state always replaces the previous state — there is no automatic merge. Spread the previous state (`return { ...state, ... }`) when you want to keep existing fields.

## Reading State

Access state in any transition or guard method:

```typescript
@Transition({ from: 'processed', to: 'end' })
async display(state: MyState): Promise<unknown> {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    content: `Processed ${state.counter} items. Result: ${state.llmResult?.content}`,
  });
  return {};
}

hasToolCalls(state: MyState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

## Persistence Across Pauses

State survives when a workflow pauses at a `wait: true` transition and resumes later:

```typescript
@Transition({ to: 'waiting' })
async setup(state: MyState): Promise<MyState> {
  return { ...state, counter: 42 };  // Set before pause
}

@Transition({ from: 'waiting', to: 'end', wait: true })
async onResume(state: MyState): Promise<unknown> {
  // state.counter is still 42
  return {};
}
```

## Accessing Workflow Args

Input arguments are available via `ctx.args`:

```typescript
@Workflow({
  schema: z.object({ value: z.number().default(150) }),
})
export class MyWorkflow extends BaseWorkflow<{ value: number }, MyState> {
  @Transition({ to: 'ready' })
  async setup(state: MyState, ctx: RunContext): Promise<MyState> {
    const args = ctx.args as { value: number };
    console.log(args.value); // 150
    return state;
  }
}
```

## Helper Methods

Use regular private methods for reusable logic — no special decorator needed:

```typescript
export class MyWorkflow extends BaseWorkflow<Record<string, unknown>, MyState> {
  @Transition({ from: 'data_created', to: 'end' })
  async showResults(state: MyState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: this.formatMessage(state.message!),
    });
    return {};
  }

  private formatMessage(text: string): string {
    return text.toUpperCase();
  }
}
```

## Registry References

- [workflow-state-example-workflow](https://loopstack.ai/registry/loopstack-workflow-state-example-workflow) — Stores state in typed state interface, accesses in transitions, uses helper methods
- [accessing-tool-results-example-workflow](https://loopstack.ai/registry/loopstack-accessing-tool-results-example-workflow) — Storing and accessing tool results via workflow state
