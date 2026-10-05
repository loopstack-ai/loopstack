---
title: Error Handling Examples
description: Error handling workflow examples for Loopstack — auto-retry with exponential backoff, retryTarget, errorPlace recovery, manual retry, transition timeouts, and sub-workflow failures routed via errorPlace.
---

# @loopstack/error-handling-examples

> Error handling workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

One workflow per way a Loopstack workflow can react to a failing transition. Each example simulates the failure deterministically, so you can watch the mode work and copy the one you need. For the full decision tree (auto-retry → `errorPlace` → manual retry), see the [Error Handling, Retry & Timeout](https://loopstack.ai/docs/build/patterns/error-handling) guide.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/error-handling-examples src/error-handling-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { ErrorHandlingExamplesModule } from './error-handling-examples/error-handling-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), ErrorHandlingExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/error-handling-examples
```

```typescript
import { ErrorHandlingExamplesModule } from '@loopstack/error-handling-examples';
```

## Environment

None — the examples call no LLM and need no secrets. The failures are simulated by two local tools: `FlakyServiceTool` (`flaky_service`) throws when told to, and `SlowOperationTool` (`slow_operation`) sleeps for a given time.

## Examples

| Example                                               | Studio title                                        | Description                                                              |
| ----------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| [Auto Retry](#auto-retry)                             | `Error Handling - Auto Retry Example`               | `retryAttempts` re-runs a failed transition with exponential backoff     |
| [Retry Target](#retry-target)                         | `Error Handling - Retry Target Example`             | `retryTarget` routes each retry through a preparation place              |
| [Error Place](#error-place)                           | `Error Handling - Error Place Example`              | `errorPlace` moves a failed workflow to a recovery place                 |
| [Manual Retry](#manual-retry)                         | `Error Handling - Manual Retry Example`             | The default: the workflow stays put and offers a Retry button            |
| [Transition Timeout](#transition-timeout)             | `Error Handling - Transition Timeout Example`       | `timeout` fails a transition that runs too long                          |
| [Sub-Workflow Error Place](#sub-workflow-error-place) | `Error Handling - Sub-Workflow Error Place Example` | A failed child's callback is routed to a recovery place via `errorPlace` |

---

## Auto Retry

`@Transition({ to: 'end', retryAttempts: 2 })` — the service call fails on the first two attempts. The framework re-runs the transition after 1s and 2s, and the third attempt succeeds. The attempt number comes from `ctx.execution.retryCount`.

```bash
loopstack run auto_retry_example
```

Completes after about 3 seconds with `result: { attempts: 3 }`.

### Files

- `workflows/auto-retry/auto-retry-example.workflow.ts`

## Retry Target

`retryAttempts: 2, retryTarget: 'refresh_credentials'` — each auto-retry re-enters the workflow at `refresh_credentials` instead of re-running the failed transition. That place does the preparation work (a simulated credential refresh) and loops back to `ready`, where the service call runs again.

```bash
loopstack run retry_target_example
```

Completes with `result: { attempts: 3, refreshes: 2 }`.

### Files

- `workflows/retry-target/retry-target-example.workflow.ts`

## Error Place

`errorPlace: 'service_failed'` — the service call always fails, and the workflow moves to `service_failed` instead of staying at its place. The run shows as failed there, with a **Recover** button that triggers the `recover` wait transition and completes the run.

```bash
loopstack run error_place_example
```

The run ends failed at `service_failed` with `Simulated external service error`. Click **Recover** in Studio (**Error Handling Examples → Error Handling - Error Place Example**), or trigger it from the CLI — the run completes with `result: { recovered: true }`:

```bash
loopstack answer <run-id> --transition recover
```

### Files

- `workflows/error-place/error-place-example.workflow.ts`
- `workflows/error-place/error-place-example.ui.yaml` — the Recover button

## Manual Retry

No `retryAttempts`, no `errorPlace` — the default. The service call fails on the first attempt, and the workflow stays at its place with a **Retry** button next to the error. The second attempt succeeds.

```bash
loopstack run manual_retry_example
```

The run ends failed with `Simulated external service error`. Click **Retry** in Studio (in an interactive terminal, `loopstack run` offers the retry itself); the run completes with `result: { attempts: 2 }`.

### Files

- `workflows/manual-retry/manual-retry-example.workflow.ts`

## Transition Timeout

`timeout: 2000` — the first attempt runs a 5-second operation and is failed after 2 seconds. With no retry options, the timeout is handled like any other failure (manual retry). The second attempt finishes instantly.

`SlowOperationTool` passes `ctx.signal` to its sleep. The framework aborts that signal when the transition times out, so the abandoned operation stops instead of running on in the background — do the same in your own long-running tools.

```bash
loopstack run transition_timeout_example
```

The run ends failed with `Transition 'runSlowOperation' timed out after 2000ms`. Click **Retry** in Studio (or accept the retry `loopstack run` offers in an interactive terminal); the run completes with `result: { attempts: 2 }`.

### Files

- `workflows/transition-timeout/transition-timeout-example.workflow.ts`

## Sub-Workflow Error Place

The parent starts a child workflow that always throws. Its callback transition declares `errorPlace: 'child_failed'`, so the failed callback moves the parent to `child_failed` — the happy-path body of `childCompleted` never runs. A **Recover** button triggers the `recover` wait transition and completes the run.

```bash
loopstack run sub_workflow_error_place_example
```

The run ends failed at `child_failed` with `Child workflow failed`. Click **Recover** in Studio, or run `loopstack answer <run-id> --transition recover` — the run completes with `result: { recovered: true }`.

### Files

- `workflows/sub-workflow-error-place/sub-workflow-error-place-example.workflow.ts`
- `workflows/sub-workflow-error-place/sub-workflow-error-place-child.workflow.ts` — the always-failing child
- `workflows/sub-workflow-error-place/sub-workflow-error-place-example.ui.yaml` — the Recover button

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
