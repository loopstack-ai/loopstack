---
title: State Management
description: Defining, reading, and updating typed workflow state. Covers state interfaces, per-transition state typing, state persistence across transitions, and state access patterns.
---

# State Management

Workflow state is managed through a typed state interface passed as the first parameter to transition methods. Transitions return nothing — they write through setter methods on `BaseWorkflow`, and the engine persists the updated state automatically across transitions. Use `async` when the body awaits.

## Defining State

Define a state interface and reference it on each transition's `state` parameter:

```typescript
interface MyState {
  counter?: number;
  llmResult?: LlmGenerateTextResult;
  items?: string[];
}

export class MyWorkflow extends BaseWorkflow {
  // State is typed per-transition via the `state` parameter — see below.
}
```

State begins as an empty object `{}` — the initial transition is responsible for populating it. For this reason, **all properties on a state schema should be optional**. If a property is required, the empty starting state will fail validation immediately. Treat missing fields as the absence of data and read them defensively (`state.counter ?? 0`).

## Writing State

`BaseWorkflow` exposes four setters. Pick the one that matches the write you want:

| Setter                       | Effect                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `this.assignState(partial)`  | Shallow-merge `partial` into the current state. The most common form — leaves any field you don't mention untouched.          |
| `this.setState(full)`        | Replace the state object outright. Use when you want to reset state or know you're writing every field.                       |
| `this.assignResult(partial)` | Shallow-merge `partial` into the workflow's published `result` (the value parent callbacks and `WorkflowRunner` callers see). |
| `this.setResult(full)`       | Replace the published `result` outright.                                                                                      |

Transitions return nothing — mutate state via setters. Returning a value is a runtime error.

```typescript
@Transition({ from: 'ready', to: 'processed' })
async process(state: MyState) {
  const result = await this.llmGenerateText.call(
    {},
    { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
  );
  this.assignState({
    llmResult: result.data,
    counter: (state.counter ?? 0) + 1,
    items: [...(state.items ?? []), 'new item'],
  });
}
```

A transition that doesn't write state simply omits the setter call:

```typescript
@Transition({ from: 'ready', to: 'logged' })
log(state: MyState) {
  this.logger.log(`counter = ${state.counter}`);
}
```

If `stateSchema` is defined on the workflow, the merged state is validated after every write.

## Reading State

Access state in any transition or guard method:

```typescript
@Transition({ from: 'processed', to: 'end' })
async display(state: MyState) {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Processed ${state.counter} items. Result: ${state.llmResult?.text}`,
  });
}

hasToolCalls(state: MyState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

## Publishing a Result

The workflow's `result` field is what `WorkflowRunner.runSync()` returns and what parent callbacks receive as `input.data`. Write to it on the final transition (or any earlier transition that wants to surface partial output):

```typescript
@Transition({ from: 'done', to: 'end' })
finish(state: MyState) {
  this.setResult({ concept: state.confirmedConcept! });
}
```

Use `this.assignResult(partial)` to build the result up across multiple transitions, and `this.setResult(full)` to replace it.

## Persistence Across Pauses

State survives when a workflow pauses at a `wait: true` transition and resumes later:

```typescript
@Transition({ to: 'waiting' })
setup(state: MyState) {
  this.assignState({ counter: 42 }); // Set before pause
}

@Transition({ from: 'waiting', to: 'end', wait: true })
onResume(state: MyState) {
  // state.counter is still 42
}
```

## Accessing Workflow Args

Input arguments are available via `ctx.args`:

```typescript
const MyArgsSchema = z.object({ value: z.number().default(150) });
type MyArgs = z.infer<typeof MyArgsSchema>;

@Workflow({
  schema: MyArgsSchema,
})
export class MyWorkflow extends BaseWorkflow<MyArgs> {
  @Transition({ to: 'ready' })
  setup(state: MyState, ctx: RunContext<MyArgs>) {
    console.log(ctx.args.value); // 150
  }
}
```

## Helper Methods

Use regular private methods for reusable logic — no special decorator needed:

```typescript
export class MyWorkflow extends BaseWorkflow {
  @Transition({ from: 'data_created', to: 'end' })
  async showResults(state: MyState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: this.formatMessage(state.message!),
    });
  }

  private formatMessage(text: string): string {
    return text.toUpperCase();
  }
}
```

## Registry References

- [workflow-state-example-workflow](https://loopstack.ai/registry/loopstack-workflow-state-example-workflow) — Stores state in typed state interface, accesses in transitions, uses helper methods
- [accessing-tool-results-example-workflow](https://loopstack.ai/registry/loopstack-accessing-tool-results-example-workflow) — Storing and accessing tool results via workflow state
