# State Management

Workflow state is managed through a typed state interface and passed as the first parameter to transition methods. State is returned from each transition and automatically persisted across transitions.

## Defining State

Define a state interface and pass it as a generic to `BaseWorkflow`:

```typescript
interface MyState {
  counter: number;
  llmResult?: LlmGenerateTextResult;
  items: string[];
}

export class MyWorkflow extends BaseWorkflow<Record<string, unknown>, MyState> {
  // ...
}
```

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
  async setup(state: MyState, ctx: LoopstackContext): Promise<MyState> {
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
