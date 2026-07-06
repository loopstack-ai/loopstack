---
title: Scheduling Examples
description: Runnable Loopstack examples for the scheduling fundamentals — cron (@Cron), webhook (@Post + @Public controller), delayed runs (SchedulerRegistry timeout), and batch (Promise.all fan-out). Each trigger starts a workflow with WorkflowRunner.run.
---

# @loopstack/scheduling-examples

> Scheduling workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

This module demonstrates the **scheduling fundamentals** — the primitives you use to start
workflows programmatically instead of clicking "Run" in Studio. Each fundamental ships as a small
workflow (the _work_) plus the real trigger that fires it (the _primitive_): a cron schedule, a
webhook endpoint, a delayed timeout, and a batch fan-out.

Background reading: [Programmatic Execution](https://loopstack.ai/docs/build/integrations/programmatic-execution).

## Install as Source (Recommended)

Examples are meant to be read, copied, and adapted. Pull the source straight into your project with [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/scheduling-examples src/scheduling-examples
```

This copies the full `src/` tree into `src/scheduling-examples/` so you can read the trigger and workflow files, edit schedules and endpoints, and ship them as your own. Drop or keep individual fundamentals as you like.

After copying, register the module in your app:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { SchedulingExamplesModule } from './scheduling-examples/scheduling-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), SchedulingExamplesModule],
})
export class AppModule {}
```

## The core primitive: `WorkflowRunner`

Every trigger boils down to injecting `WorkflowRunner` (from `@loopstack/core`, globally available
once `LoopstackModule.forRoot()` is imported) and calling:

- **`run(WorkflowClass, args, { appName, userId })`** — enqueue on BullMQ, return a `workflowId`. Used by
  all triggers here.
- **`runSync(WorkflowClass, args, { appName, userId, stateless? })`** — execute inline and await the result.

Background triggers (cron, webhooks, timeouts) have no HTTP request, so no user context. The
[`RunUserResolver`](./src/support/run-user.resolver.ts) helper picks the local Studio user to run as —
open Studio once so that user exists.

## The fundamentals

| Fundamental | The primitive (where it lives)                                                                                           | The work                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Cron**    | [`CronTriggerScheduler`](./src/workflows/cron-trigger/cron-trigger.scheduler.ts) — `@Cron(EVERY_MINUTE)`                 | [`CronTriggerWorkflow`](./src/workflows/cron-trigger/cron-trigger.workflow.ts) posts a message            |
| **Webhook** | [`WebhookTriggerController`](./src/workflows/webhook-trigger/webhook-trigger.controller.ts) — `@Public @Post('payment')` | [`WebhookTriggerWorkflow`](./src/workflows/webhook-trigger/webhook-trigger.workflow.ts) records a receipt |
| **Delayed** | [`DelayedRunController`](./src/workflows/delayed-run/delayed-run.controller.ts) — `SchedulerRegistry` one-off timeout    | [`DelayedRunWorkflow`](./src/workflows/delayed-run/delayed-run.workflow.ts) sends a follow-up             |
| **Batch**   | [`BatchTriggerController`](./src/workflows/batch-trigger/batch-trigger.controller.ts) — `Promise.all` fan-out            | [`BatchTriggerWorkflow`](./src/workflows/batch-trigger/batch-trigger.workflow.ts) emails one recipient    |

The trigger is where the scheduling primitive actually lives; the work workflow is just what it
launches.

> The webhook/delayed/batch controllers are marked `@Public()` so you can `curl` them without a token.
> Real integrations should secure them — verify a provider signature on webhooks, require auth on
> batch/admin endpoints.

### Run it all from Studio — no curl needed

Studio exposes **three launchable workflows**, one per HTTP-triggered fundamental. Each makes the real
HTTP `POST` to its endpoint — the same call an external caller would make — and posts the response:

| Run this in Studio                                                                    | What it does                                                                      |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`CallWebhookWorkflow`](./src/workflows/webhook-trigger/call-webhook.workflow.ts)     | `POST /webhooks/scheduling-examples/payment` → fires `WebhookTriggerWorkflow`     |
| [`CallSignupWorkflow`](./src/workflows/delayed-run/call-signup.workflow.ts)           | `POST /webhooks/scheduling-examples/signup` → schedules `DelayedRunWorkflow`      |
| [`CallNewsletterWorkflow`](./src/workflows/batch-trigger/call-newsletter.workflow.ts) | `POST /webhooks/scheduling-examples/newsletter` → fans out `BatchTriggerWorkflow` |

They go over real HTTP (`fetch` to `http://localhost:$PORT`), so they prove the whole trigger path,
not just the workflow body. The cron fundamental needs no launcher — it fires on its own schedule. The
`curl` commands below do the same thing from a terminal. The launched "work" workflows
(`WebhookTriggerWorkflow`, etc.) are registered but not listed as standalone Studio entries.

### Cron — `@Cron`

`CronTriggerScheduler.tick()` is a NestJS `@Cron(CronExpression.EVERY_MINUTE)` method that calls
`WorkflowRunner.run(CronTriggerWorkflow, …)`. It is **off by default** so it doesn't spam your
workspace — enable it with:

```bash
SCHEDULING_EXAMPLES_CRON_ENABLED=true
```

```ts
@Cron(CronExpression.EVERY_MINUTE)
async tick() {
  if (this.configService.get('SCHEDULING_EXAMPLES_CRON_ENABLED') !== 'true') return;
  const userId = await this.runUser.resolve();
  if (!userId) return;
  await this.workflowRunner.run(CronTriggerWorkflow, { message: 'hello world' }, { appName, userId });
}
```

Swap `CronExpression.EVERY_MINUTE` for a cron string like `'0 9 * * MON'` for "every Monday at 9am".

### Webhook — `@Public @Post`

```bash
curl -X POST http://localhost:3000/webhooks/scheduling-examples/payment \
  -H 'content-type: application/json' \
  -d '{"customerEmail":"grace@example.com","amountCents":4200,"currency":"USD"}'
```

The controller maps the request body to workflow args and calls `run()`, returning the `workflowId`.

### Delayed — `SchedulerRegistry` timeout

```bash
curl -X POST http://localhost:3000/webhooks/scheduling-examples/signup \
  -H 'content-type: application/json' -d '{"email":"grace@example.com"}'
```

Registers a one-off timeout (default 10s, override with `SCHEDULING_EXAMPLES_FOLLOWUP_DELAY_MS`) that
fires the follow-up workflow later — the "run this in 24h after signup" pattern, sped up for the demo.

> `SchedulerRegistry` timeouts live in memory: a server restart loses any pending follow-up. For a
> durable long delay, enqueue a BullMQ delayed job instead.

### Batch — `Promise.all` fan-out

```bash
curl -X POST http://localhost:3000/webhooks/scheduling-examples/newsletter \
  -H 'content-type: application/json' \
  -d '{"recipients":["ada@example.com","grace@example.com"]}'
```

Launches one workflow run per recipient in parallel and returns all the `workflowId`s.

## Using in your app

```ts
import { SchedulingExamplesModule } from '@loopstack/scheduling-examples';

@Module({
  imports: [LoopstackModule.forRoot(), SchedulingExamplesModule],
})
export class AppModule {}
```

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
