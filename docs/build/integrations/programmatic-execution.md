---
title: Programmatic Workflow Execution
description: Starting and managing workflows from code using WorkflowRunner. Covers triggering from API requests, webhooks, cron jobs, batch processing, and internal events.
---

# Running Workflows Programmatically

Start and manage workflows programmatically from your NestJS application — in response to API requests, webhook events, cron jobs, or internal application logic — without going through the Studio UI.

## Overview

Use the `WorkflowRunner` to execute workflows in response to:

- External API requests
- Webhook events
- Scheduled cron jobs
- Internal application events
- Batch processing tasks

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
