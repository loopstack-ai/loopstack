---
title: Transitions Examples
description: Workflow examples for transitions in Loopstack — guard-based dynamic routing with priorities, and a guarded loop that walks a list in fixed-size batches.
---

# @loopstack/transitions-examples

> Transition workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Transitions are the edges of a Loopstack workflow: each one declares the place it leaves, the place it
enters, and optionally a `@Guard` that decides whether it may fire at all. These two examples cover the two
shapes that buys you — branching on a runtime value, and looping a place back onto itself.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/transitions-examples src/transitions-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { TransitionsExamplesModule } from './transitions-examples/transitions-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), TransitionsExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/transitions-examples
```

```typescript
import { TransitionsExamplesModule } from '@loopstack/transitions-examples';
```

No provider modules, secrets or environment variables are needed — both workflows are pure state machines.

## Examples

| Example                               | Studio title                             | Run                                                                            |
| ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| [Dynamic Routing](#dynamic-routing)   | `Transitions - Dynamic Routing Example`  | `loopstack run dynamic_routing_example --arg value=250`                        |
| [Batch Processing](#batch-processing) | `Transitions - Batch Processing Example` | `loopstack run batch_processing_example --arg totalItems=25 --arg batchSize=5` |

---

## Dynamic Routing

Several transitions leave the same place. Each carries a `@Guard('methodName')`, and the engine evaluates
them highest `priority` first — the first guard that returns `true` wins, and a transition with no priority
acts as the fallback. Two forks are chained so you can see the pattern compose:

| `value`   | Route                        |
| --------- | ---------------------------- |
| `> 200`   | `prepared → placeA → placeC` |
| `101…200` | `prepared → placeA → placeD` |
| `≤ 100`   | `prepared → placeB`          |

Use this instead of `if`-chains inside a single transition: the branch becomes part of the state machine, so
it shows up in the run's path and in Studio.

### Files

- `workflows/dynamic-routing/dynamic-routing-example.workflow.ts`

## Batch Processing

A guarded transition (`nextBatch`) sends `batch_done` back to `batch_ready`, so the machine walks the list one
fixed-size batch at a time; a second guard (`allItemsProcessed`, given the higher priority) is what finally
leaves the loop. Items _within_ a batch run concurrently via `Promise.all`; batches run one after another.

Reach for this over `FanOutWorkflow` (see `@loopstack/sub-workflow-examples`) when you must bound
concurrency — rate-limited APIs, memory-bounded work, quota-constrained operations.

### Files

- `workflows/batch-processing/batch-processing-example.workflow.ts`

## Tests

```bash
npm test
```

Both workflows run in-process against the real state machine — the specs assert the _path_ taken, which is
the thing these examples exist to demonstrate.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
