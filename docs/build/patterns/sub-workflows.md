---
title: Sub-Workflows
description: Running workflows inside other workflows via .run(), the show option ('inline' | 'link' | 'hidden') for parent-view rendering, callback transitions, typing the callback payload with CallbackSchema.extend({ data }), handling sub-workflow failures via payload.hasError / payload.errorMessage without try/catch, passing arguments to child workflows, receiving sub-workflow results, and coordinating multiple sub-workflows via FanOutWorkflow (parallel) and SequenceWorkflow (sequential) with 'all' / 'allSettled' failure modes.
---

# Sub-Workflows

Sub-workflows let you compose complex automations from smaller, reusable workflow building blocks. A parent workflow can launch one or more child workflows via `.run()`, pause until they complete, and receive results through a callback transition.

## Injecting a Sub-Workflow

```typescript
import { CallbackSchema, QueueResult } from '@loopstack/common';

constructor(private readonly subWorkflow: SubWorkflow) {
  super();
}
```

## Running a Sub-Workflow

```typescript
@Transition({ to: 'sub_started' })
async start(state: MyState): Promise<MyState> {
  await this.subWorkflow.run(
    { prompt: 'Hello' },                          // Args passed to the sub-workflow
    { callback: { transition: 'onSubComplete' } }, // Method to call when done
  );
  return state;
}
```

The parent's run view automatically renders the child sub-workflow inline by default — there is no extra `documentStore.save(LinkDocument, …)` step.

## Controlling How the Child Appears: `show`

The `show` option on `RunOptions` controls how the child sub-workflow is rendered inside the parent's run view:

| `show`                 | What the parent sees                                                                                           | Use for                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `'inline'` _(default)_ | The child is embedded as an inline iframe; the user can interact with it in place.                             | HITL prompts, OAuth flows, agents whose progress you want visible. |
| `'link'`               | A status link card with the child's label and live status — opens the child in a separate window when clicked. | Long-running autonomous children the parent just tracks.           |
| `'hidden'`             | Nothing is shown.                                                                                              | Background fan-out where surfacing each child would be noise.      |

```typescript
await this.askUser.run(args, {
  callback: { transition: 'answered' },
  show: 'inline', // (default) embed the child UI in the parent's view
  label: 'Waiting for user answer', // optional — defaults to the child workflow's name
});

await this.longJob.run(args, {
  callback: { transition: 'done' },
  show: 'link', // status card, opens child in a separate window
});

await this.background.run(args, {
  show: 'hidden', // no card at all
});
```

The link card's status is read live from the child workflow's actual state — it transitions from pending to success or failure automatically as the child runs.

## Receiving the Callback

The sub-workflow's final transition return value is passed as `payload.data`:

```typescript
const SubWorkflowCallbackSchema = CallbackSchema.extend({
  data: z.object({ message: z.string() }),
});

@Transition({
  from: 'sub_started',
  to: 'sub_done',
  wait: true,
  schema: SubWorkflowCallbackSchema,
})
async onSubComplete(
  state: MyState,
  payload: { workflowId: string; status: string; data: { message: string } },
): Promise<MyState> {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Sub-workflow said: ${payload.data.message}`,
  });
  return state;
}
```

## Typing the Callback Payload

Every sub-workflow callback receives the same envelope, defined by `CallbackSchema` in `@loopstack/common`:

```typescript
export const CallbackSchema = z.object({
  workflowId: z.string(),
  status: z.string(),
  hasError: z.boolean(),
  errorMessage: z.string().nullable(),
  data: z.unknown(),
});
```

| Field          | Type             | What it is                                                                   |
| -------------- | ---------------- | ---------------------------------------------------------------------------- |
| `workflowId`   | `string`         | ID of the child run that produced this callback.                             |
| `status`       | `string`         | The child's terminal place (e.g. `'end'`, or a custom final state).          |
| `hasError`     | `boolean`        | `true` if the child terminated in failure — branch on this, not on `status`. |
| `errorMessage` | `string \| null` | Error message if `hasError`, otherwise `null`.                               |
| `data`         | `unknown`        | The value returned by the child's final transition.                          |

`data` is `unknown` on the base schema because every sub-workflow returns a different shape. Type it by extending the schema with your own `data` definition:

```typescript
import { CallbackSchema } from '@loopstack/common';
import { z } from 'zod';

const MyCallback = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});

@Transition({
  from: 'awaiting',
  to: 'end',
  wait: true,
  schema: MyCallback,
})
async onAnswer(state: MyState, payload: z.infer<typeof MyCallback>): Promise<unknown> {
  // payload.workflowId, payload.status, payload.hasError available at top level
  // payload.data.answer is fully typed
  return { answer: payload.data.answer };
}
```

The extended schema goes on the `@Transition({ schema })` — the framework validates the payload against it before the transition fires. Use `z.infer<typeof MyCallback>` to derive the parameter type rather than hand-writing the shape.

## Error Handling

When a sub-workflow throws, the failure does **not** bubble up through `run()` — `run()` only schedules the child. Instead, the parent's callback transition still fires, with `hasError: true` and `errorMessage` populated. The parent branches on `payload.hasError`:

```typescript
import { z } from 'zod';
import { BaseWorkflow, CallbackSchema, MessageDocument, Transition, Workflow } from '@loopstack/common';

type FailingCallback = z.infer<typeof CallbackSchema>;

@Workflow({ title: 'Recovers from a Failing Child' })
export class RecoveringParentWorkflow extends BaseWorkflow {
  constructor(private readonly failingSub: FailingSubWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting' })
  async launch(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.failingSub.run({}, { callback: { transition: 'onFinished' }, show: 'link', label: 'Failing child' });
    return state;
  }

  @Transition({ from: 'awaiting', to: 'end', wait: true, schema: CallbackSchema })
  async onFinished(state: Record<string, unknown>, payload: FailingCallback): Promise<unknown> {
    if (payload.hasError) {
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        text: `Child failed: ${payload.errorMessage ?? 'unknown error'} — continuing with a fallback.`,
      });
      return { recovered: true };
    }
    return { recovered: false };
  }
}
```

Two things to note:

- **No try/catch at the parent.** The child's exception is captured by the framework, persisted on the child run, and surfaced through the callback envelope. The parent only sees `hasError`.
- **The link card / inline iframe turns red automatically.** No extra UI wiring is needed to reflect the failure in the parent's run view.

For `FanOutWorkflow` and `SequenceWorkflow` the same idea applies one level deeper: each item's per-result entry carries its own `hasError`, and the aggregate payload exposes `payload.data.hasErrors` and `payload.data.errorCount`.

## Sub-Workflow Output

The sub-workflow defines its output as the return value of its final transition:

```typescript
@Workflow({ widget: __dirname + '/sub.ui.yaml' })
export class SubWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  async start(): Promise<{ message: string }> {
    return { message: 'Hi mom!' };
  }
}
```

## Complete Example

```typescript
@Workflow({ widget: __dirname + '/parent.ui.yaml' })
export class ParentWorkflow extends BaseWorkflow {
  constructor(private readonly subWorkflow: SubWorkflow) {
    super();
  }

  @Transition({ to: 'sub_started' })
  async runWorkflow(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.subWorkflow.run(
      {},
      { callback: { transition: 'subWorkflowCallback' }, show: 'link', label: 'Sub-Workflow' },
    );
    return state;
  }

  @Transition({
    from: 'sub_started',
    to: 'end',
    wait: true,
    schema: CallbackSchema.extend({ data: z.object({ message: z.string() }) }),
  })
  async subWorkflowCallback(
    state: Record<string, unknown>,
    payload: { workflowId: string; status: string; data: { message: string } },
  ): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Message from sub-workflow: ${payload.data.message}`,
    });
    return {};
  }
}
```

## Running Sub-Workflows in Parallel

To launch multiple sub-workflows at the same time and receive a single aggregated callback when they all complete, use the built-in `FanOutWorkflow` from `@loopstack/core`. Inject it like any other sub-workflow.

```typescript
import { type FanOutCallbackPayload, FanOutCallbackSchema, FanOutWorkflow } from '@loopstack/core';

@Workflow({ title: 'Parallel Fan-Out' })
export class ParallelWorkflow extends BaseWorkflow {
  constructor(private readonly fanOut: FanOutWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting' })
  async launch(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.fanOut.run(
      {
        items: {
          user: { workflow: 'fetch_user', args: { id: 1 } },
          orders: { workflow: 'fetch_orders', args: { id: 1 } },
        },
      },
      { callback: { transition: 'onAllDone' } },
    );
    return state;
  }

  @Transition({ from: 'awaiting', to: 'end', wait: true, schema: FanOutCallbackSchema })
  async onAllDone(state: Record<string, unknown>, payload: FanOutCallbackPayload): Promise<unknown> {
    const user = (payload.data.results as Record<string, { data?: unknown }>).user.data;
    const orders = (payload.data.results as Record<string, { data?: unknown }>).orders.data;
    return { user, orders };
  }
}
```

`items` accepts either a **keyed record** (results addressable by name) or an **array** of `{ workflow, args, label?, show? }` (results returned in input order with each entry's `key`). The `workflow` field is the canonical name string — either the explicit `@Workflow({ name })` value or the auto-derived snake_case form (e.g. `FetchUserWorkflow` → `'fetch_user'`).

### Failure modes

| `mode`              | Behavior                                                                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'all'` _(default)_ | First failure triggers `cancelChildren` on the parent; the callback fires once every in-flight child has settled (canceled siblings also send callbacks). `payload.data.hasErrors` is `true`. |
| `'allSettled'`      | Every child runs to completion regardless of siblings; the callback aggregates `completed` / `failed` results for every item.                                                                 |

## Running Sub-Workflows in Sequence

To run sub-workflows one after another with a single aggregated callback at the end, use `SequenceWorkflow`. Same call shape as `FanOutWorkflow`, same `'all'` / `'allSettled'` modes.

```typescript
import { SequenceWorkflow, SequenceCallbackSchema, type SequenceCallbackPayload } from '@loopstack/core';

@Workflow({ title: 'Sequential' })
export class SequentialWorkflow extends BaseWorkflow {
  constructor(private readonly sequence: SequenceWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting' })
  async launch(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.sequence.run(
      {
        items: [
          { workflow: 'step_a', args: { ... }, label: 'step-1' },
          { workflow: 'step_b', args: { ... }, label: 'step-2' },
          { workflow: 'step_c', args: { ... }, label: 'step-3' },
        ],
      },
      { callback: { transition: 'onComplete' } },
    );
    return state;
  }

  @Transition({ from: 'awaiting', to: 'end', wait: true, schema: SequenceCallbackSchema })
  async onComplete(state: Record<string, unknown>, payload: SequenceCallbackPayload): Promise<unknown> {
    return { results: payload.data.results };
  }
}
```

In `mode: 'all'`, a failure aborts the sequence and remaining items are marked `'skipped'` in the result. In `mode: 'allSettled'`, the sequence continues past failures.

`FanOutWorkflow` and `SequenceWorkflow` are auto-registered by `LoopstackModule.forRoot()` — there is no manual `providers: [...]` entry needed for them. You still register your own sub-workflows normally.

## Registering Sub-Workflows

Both workflows must be registered in the module:

```typescript
@Module({
  providers: [ParentWorkflow, SubWorkflow],
  exports: [ParentWorkflow, SubWorkflow],
})
export class MyModule {}
```

## Wrapping as a Task Tool

A task tool is a `BaseTool` that launches a sub-workflow and returns `pending`. The framework calls `complete()` when the sub-workflow finishes. This lets agents decide when to run sub-workflows.

```typescript
@Tool({
  name: 'run_tests',
  description: 'Run tests in the specified directory.',
  schema: z.object({
    testDirectory: z.string().describe('Directory containing the test files to run.'),
  }),
})
export class RunTestsTask extends BaseTool {
  constructor(private readonly testRunner: TestRunnerWorkflow) {
    super();
  }

  protected async handle(
    args: { testDirectory: string },
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolResult> {
    const result = await this.testRunner.run(
      { testDirectory: args.testDirectory },
      { callback: options?.callback, show: 'inline', label: 'Running tests...' },
    );

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    const data = result as { data?: { passed: boolean; output: string } };
    return { data: data.data ?? result };
  }
}
```

Key parts:

- **`pending: { workflowId }`** tells the framework this tool is async — the parent workflow waits for a callback
- **`callback: options?.callback`** passes the parent's callback config to the sub-workflow
- **`show`** decides how the child appears in the parent's run view (`'inline'` by default)
- **`complete()`** is called when the sub-workflow finishes — transform results and return the tool's final value here

## Nested Agents

The sub-workflow can be an `AgentWorkflow` itself, enabling multi-agent architectures. See [Agent Workflows](../ai/agent-workflows.md) for the full pattern.

## Registry References

- [run-sub-workflow-example](https://loopstack.ai/registry/loopstack-run-sub-workflow-example) — Parent calling sub-workflows with callbacks and typed output, all three `show` modes chained, `FanOutWorkflow` / `SequenceWorkflow` coordination, and a failing-child workflow paired with a parent that branches on `payload.hasError`
- [@loopstack/code-agent](https://loopstack.ai/registry/loopstack-code-agent) — ExploreTask wrapping AgentWorkflow as a task tool
