---
title: Sub-Workflow Examples
description: Workflow examples for sub-workflow composition in Loopstack — launching children with .run() and callbacks, the three show modes, failed-child handling, fan-out, and sequence.
---

# @loopstack/sub-workflow-examples

> Sub-workflow composition examples for the [Loopstack](https://loopstack.ai) automation framework.

A workflow starts another workflow by injecting it and calling `.run(args, { callback: { transition } })`.
The parent then parks on the named wait transition until the child finishes, and resumes with the child's
result as the transition input. This package covers that call, what happens when the child fails, how the
child is rendered, and the two built-in coordinators for running several children at once.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/sub-workflow-examples src/sub-workflow-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { SubWorkflowExamplesModule } from './sub-workflow-examples/sub-workflow-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), SubWorkflowExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/sub-workflow-examples @loopstack/core
```

```typescript
import { SubWorkflowExamplesModule } from '@loopstack/sub-workflow-examples';
```

`FanOutWorkflow` and `SequenceWorkflow` come from `@loopstack/core` and are registered by
`LoopstackModule.forRoot()` — nothing else to wire. No secrets or environment variables are needed.

## Examples

| Example                           | Studio title                            | Run                                                     |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| [Run](#run)                       | `Sub-Workflow - Run Example`            | `loopstack run run_sub_workflow_example_parent`         |
| [Show Modes](#show-modes)         | `Sub-Workflow - Show Modes Example`     | `loopstack run run_sub_workflow_example_show_modes`     |
| [Error Handling](#error-handling) | `Sub-Workflow - Error Handling Example` | `loopstack run run_sub_workflow_example_error_handling` |
| [Fan-Out](#fan-out)               | `Sub-Workflow - Fan-Out Example`        | `loopstack run run_sub_workflow_example_fan_out`        |
| [Sequence](#sequence)             | `Sub-Workflow - Sequence Example`       | `loopstack run run_sub_workflow_example_sequence`       |

The two child workflows (`Sub-Workflow - Child` and `Sub-Workflow - Failing Child`) are providers only —
they are launched by their parents rather than started from the sidebar.

---

## Run

The basic call. The parent injects the child, calls `.run({}, { callback: { transition: 'subWorkflowCallback' } })`,
and the matching `@Transition({ wait: true, schema })` receives the child's result as `input.data`. It does
this twice in a row to show that a parent can chain children.

### Files

- `workflows/run/run-example.workflow.ts` — the parent
- `workflows/run/child.workflow.ts` — the child, shared by every example here

## Show Modes

`RunOptions.show` decides only how the child appears in the parent's stream — never how it executes:

| `show`     | Rendering                                                            |
| ---------- | -------------------------------------------------------------------- |
| `'inline'` | embedded in the parent's stream, auto-collapsing when the child ends |
| `'link'`   | a status link card; clicking it opens the child                      |
| `'hidden'` | nothing is rendered — the callback still fires normally              |

All three are chained in one flow so you can compare them in a single run.

### Files

- `workflows/show-modes/show-modes-example.workflow.ts`

## Error Handling

A child that always throws does not kill its parent. The callback still fires, with `input.hasError` and
`input.errorMessage` carrying the failure, so the parent can branch on it — no need to look the child up
separately. The example runs the same failing child twice, `inline` and then `link`, so you can inspect the
error UI in both.

### Files

- `workflows/error-handling/error-handling-example.workflow.ts` — the parent
- `workflows/error-handling/failing-child.workflow.ts` — a child wired to always throw

## Fan-Out

`FanOutWorkflow` (from `@loopstack/core`) launches every item at once and resumes the parent **once**, with
all the results keyed by item name plus `hasErrors` / `errorCount`. Use it when the children are independent
and you want them all in flight together. To bound the concurrency instead, see the batch-processing example
in `@loopstack/transitions-examples`.

### Files

- `workflows/fan-out/fan-out-example.workflow.ts`

## Sequence

`SequenceWorkflow` (from `@loopstack/core`) runs the items one at a time and resumes the parent once at the
end, with the results in the declared order. Same aggregated callback as fan-out, different execution order.

### Files

- `workflows/sequence/sequence-example.workflow.ts`

## Tests

```bash
npm test
```

Children run inline in the test harness, so a whole composition completes in-process — no Redis, no
Postgres. `run-example.workflow.spec.ts` shows both the `runWorkflow` facade and the lower-level processor
API underneath it.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
