---
title: Scheduling & Programmatic Execution
description: Scheduling and programmatic workflow execution with WorkflowRunner — cron (@Cron), webhook endpoints, delayed runs (SchedulerRegistry), batch fan-out, and triggering from API requests or internal events. run vs runSync, appName/userId context.
---

# Scheduling & Programmatic Execution

Start and manage workflows programmatically from your NestJS application — in response to API requests, webhook events, cron jobs, or internal application logic — without going through the Studio UI.

## Overview

Use the `WorkflowRunner` to execute workflows in response to:

- External API requests
- Webhook events
- Scheduled cron jobs
- Internal application events
- Batch processing tasks

For a runnable version of every pattern below — cron, webhook, delayed run, and batch — see the
[`@loopstack/scheduling-examples`](#registry-references) package. Each fundamental ships as a small
workflow plus the real trigger that fires it, and you can drive the HTTP-triggered ones straight from
Studio.

## Basic Example

### Create a Controller

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { WorkflowRunner } from '@loopstack/core';
import { MyWorkflow } from './workflows/my.workflow';

@Controller()
export class AppController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('run-my-workflow')
  async runMyWorkflow(@Body() payload: any) {
    const userId = '...'; // define a user id to run the workflow
    const result = await this.workflowRunner.run(MyWorkflow, payload, {
      appName: 'default',
      userId,
    });

    return { message: 'Workflow run is queued.', workflowId: result.workflowId };
  }
}
```

### WorkflowRunner Methods

```typescript
// Async (queued via BullMQ)
await this.workflowRunner.run(
  workflow, // Workflow class reference
  args, // Data passed as workflow args (type-safe)
  {
    appName, // App name for workspace resolution
    userId, // User ID for execution context
  },
);

// Sync (inline execution, awaits result)
await this.workflowRunner.runSync(
  workflow, // Workflow class reference
  args, // Data passed as workflow args (type-safe)
  {
    appName, // App name for workspace resolution
    userId, // User ID for execution context
    stateless, // Optional: skip persistence (default: false)
  },
);
```

## Advanced Examples

### Webhook Handler

Trigger a workflow when receiving a webhook:

```typescript
import { Body, Controller, Headers, Post } from '@nestjs/common';
import { WorkflowRunner } from '@loopstack/core';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('stripe')
  async handleStripeWebhook(@Body() webhookData: any, @Headers('stripe-signature') signature: string) {
    await this.workflowRunner.run(
      ProcessWebhookWorkflow,
      {
        source: 'stripe',
        event: webhookData,
        receivedAt: new Date().toISOString(),
      },
      {
        appName: 'main',
        userId: webhookData.userId,
      },
    );

    return { received: true };
  }
}
```

### Scheduled Task

Execute a workflow on a schedule using NestJS's `@Cron` decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowRunner } from '@loopstack/core';

@Injectable()
export class TaskScheduler {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async generateDailyReports() {
    const users = await this.getUsersWithReportsEnabled();

    for (const user of users) {
      await this.workflowRunner.run(
        DailyReportWorkflow,
        {
          reportDate: new Date().toISOString(),
          reportType: 'daily',
        },
        {
          appName: 'reports',
          userId: user.id,
        },
      );
    }
  }
}
```

### Delayed Run

Run a workflow once after a delay — e.g. "follow up 24h after signup". Register a one-off timeout with NestJS's `SchedulerRegistry`, then trigger the workflow when it fires:

```typescript
import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { WorkflowRunner } from '@loopstack/core';

@Injectable()
export class SignupFollowupService {
  constructor(
    private readonly workflowRunner: WorkflowRunner,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  scheduleFollowup(email: string, userId: string, delayMs = 24 * 60 * 60 * 1000) {
    const name = `signup-followup-${randomUUID()}`;

    const timeout = setTimeout(() => {
      this.scheduler.deleteTimeout(name);
      void this.workflowRunner.run(SignupFollowupWorkflow, { email }, { appName: 'onboarding', userId });
    }, delayMs);

    this.scheduler.addTimeout(name, timeout);
  }
}
```

`SchedulerRegistry` timeouts live in memory, so a server restart loses any pending run. For delays that must survive restarts, enqueue a [BullMQ delayed job](https://docs.bullmq.io/guide/jobs/delayed) instead.

### Batch Processing

Process multiple items by triggering workflows in parallel:

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowRunner } from '@loopstack/core';

@Injectable()
export class OrderProcessingService {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  async processPendingOrders() {
    const pendingOrders = await this.getPendingOrders();

    const promises = pendingOrders.map((order) =>
      this.workflowRunner.run(
        ProcessOrderWorkflow,
        {
          orderId: order.id,
          orderData: order,
        },
        {
          appName: 'orders',
          userId: order.userId,
        },
      ),
    );

    await Promise.all(promises);
    return { processed: pendingOrders.length };
  }
}
```

## Registry References

- [scheduling-examples](https://loopstack.ai/registry/loopstack-scheduling-examples) — Runnable examples of every scheduling fundamental: cron (`@Cron` + `WorkflowRunner.run`), webhook (`@Public @Post` controller), delayed run (`SchedulerRegistry` timeout), and batch (`Promise.all` fan-out). Includes Studio-launchable workflows that make the real HTTP call to each trigger endpoint.
