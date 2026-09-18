---
title: Error Handling Examples
description: Workflow examples for error handling in Loopstack — auto-retry with backoff, manual retry, custom error places, timeouts, retryTarget, and sub-workflow failure routing.
---

# @loopstack/error-handling-examples

> Error handling workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

When a transition throws, what happens next is declared on the transition itself. This package walks through
every option Loopstack gives you, in one guided workflow you step through in Studio.

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

No provider modules, secrets or environment variables are needed — the failures are simulated by local tools.

## Examples

| Example                     | Studio title                           | Run                         |
| --------------------------- | -------------------------------------- | --------------------------- |
| [Error Retry](#error-retry) | `Error Handling - Error Retry Example` | `loopstack run error_retry` |

---

## Error Retry

A single guided workflow that walks through seven error modes in order. Each step prints what it is about to
do and whether you need to click anything, so run it in Studio (or drive it from the CLI) and follow along.

| Step | Mode                      | Declared as                                    | What happens                                                                |
| ---- | ------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | Auto-retry                | `retryAttempts: 2`                             | Fails twice, retries with exponential backoff (1s, 2s), succeeds on the 3rd |
| 2    | Manual retry              | _(nothing)_                                    | Fails and stays on its place — you click **Retry**                          |
| 3    | Custom error place        | `errorPlace: 'error_custom'`                   | Always fails; routed to a place with a **Recover** transition               |
| 4    | Timeout                   | `timeout: 2000`                                | First attempt takes 5s and is killed; **Retry** runs a fast one             |
| 5    | Hybrid                    | `retryAttempts: 1, errorPlace: 'error_hybrid'` | Auto-retries once, then routes to the error place                           |
| 6    | `retryTarget`             | `retryAttempts: 2, retryTarget: 'retry_prep'`  | Each retry re-enters a prep place first (cache invalidation, token refresh) |
| 7    | Sub-workflow `errorPlace` | `wait: true, errorPlace: 'sub_failed'`         | A failing child's callback is routed to a recovery transition               |

The `Recover` buttons come from `error-retry-example.ui.yaml`, which binds a button widget to each error
place.

### Files

- `workflows/error-retry/error-retry-example.workflow.ts` — the workflow
- `workflows/error-retry/error-retry-example.ui.yaml` — the Recover buttons, one per error place
- `workflows/error-retry/failing-child.workflow.ts` — always-failing child used by step 7
- `workflows/error-retry/tools/{step1,step2,slow}.tool.ts` — tools that succeed, fail on demand, or stall

## Tests

```bash
npm test
```

The spec covers the two modes that are decided purely by the state machine — the manual-retry default and
`errorPlace` routing — by replaying the `step2` tool's envelopes to choose which step fails. The modes that
count attempts across scheduled retries (auto-retry, hybrid, `retryTarget`) are driven by the queue's backoff
scheduler, so they are verified by running the workflow in Studio rather than in-process.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
