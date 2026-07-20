---
title: Quota Module
description: Opt-in quota tracking and enforcement for Loopstack tool calls — QuotaModule.forRoot(), QuotaInterceptor, QuotaCalculatorRegistry, QuotaClientService, AiGenerateTextQuotaCalculator, ProcessingTimeQuotaCalculator, Redis-backed usage counters, model pricing lookup
---

# @loopstack/quota

> Quota tracking module for the [Loopstack](https://loopstack.ai) automation framework.

Opt-in, Redis-backed quota tracking and enforcement for tool calls. Ships with calculators for AI token cost (USD-based, per-model pricing) and processing time, and lets you register custom calculators for any tool.

## When to Use

- You run workflows that call LLM tools and need to track or cap per-user spend
- You want to enforce processing-time limits across all tool calls
- You need a pluggable quota system where different tools report different cost metrics
- You are building a multi-tenant platform and need per-user usage counters backed by Redis

If you only need simple rate limiting (requests per minute), a standard NestJS throttler may be simpler. This module is designed for cumulative usage tracking with heterogeneous cost models.

## Installation

```sh
npm install @loopstack/quota
```

Register the module with explicit options:

```ts
import { QuotaModule } from '@loopstack/quota';

@Module({
  imports: [
    QuotaModule.forRoot({
      enabled: true,
      redisHost: 'localhost',
      redisPort: 6379,
      redisPassword: process.env.REDIS_PASSWORD,
    }),
  ],
})
export class AppModule {}
```

Or read configuration from environment variables:

```ts
@Module({
  imports: [QuotaModule.forRootAsync()],
})
export class AppModule {}
```

`forRootAsync()` reads `QUOTA_ENABLED`, `QUOTA_REDIS_HOST` (fallback `REDIS_HOST`), `QUOTA_REDIS_PORT` (fallback `REDIS_PORT`), and `QUOTA_REDIS_PASSWORD` (fallback `REDIS_PASSWORD`).

When `enabled` is `false` (the default), the Redis connection is skipped and the interceptor becomes a no-op — safe to leave wired up in development.

## Quick Start

Once the module is registered, the `QuotaInterceptor` is automatically discovered via `@UseToolInterceptor()` and runs on every tool call. No additional wiring is needed for the built-in calculators.

The module auto-registers `AiGenerateTextQuotaCalculator` for `LlmGenerateTextTool` and `LlmGenerateObjectTool` on startup.

To read or manipulate quota counters directly, inject `QuotaClientService`:

```ts
import { Injectable } from '@nestjs/common';
import { QuotaClientService } from '@loopstack/quota';

@Injectable()
export class BillingService {
  constructor(private readonly quotaClient: QuotaClientService) {}

  async getUserUsage(userId: string) {
    const llmCost = await this.quotaClient.checkQuota(userId, 'llm-cost');
    const processingTime = await this.quotaClient.checkQuota(userId, 'processing-time-ms');
    return { llmCost, processingTime };
  }
}
```

## How It Works

The `QuotaInterceptor` wraps every tool call with a pre-check / post-report cycle:

```
Tool call starts
  |
  v
Check processing-time quota --> exceeded? --> throw Error
  |
  v
Look up tool-specific calculator in QuotaCalculatorRegistry
  |
  v
Check tool-specific quota --> exceeded? --> throw Error
  |
  v
Execute tool
  |
  v
Report processing-time usage (wall-clock ms)
  |
  v
Report tool-specific usage (e.g. LLM cost in microcents)
  |
  v
Return result
```

### Quota types

Two quota types are tracked out of the box:

| Quota Type           | Calculator                      | Unit                             | Description                                                          |
| -------------------- | ------------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `llm-cost`           | `AiGenerateTextQuotaCalculator` | Microcents (1 USD = 100,000,000) | Computes cost from input/output/cache tokens using per-model pricing |
| `processing-time-ms` | `ProcessingTimeQuotaCalculator` | Milliseconds                     | Wall-clock duration of each tool call                                |

### Model pricing

`AiGenerateTextQuotaCalculator` uses `getModelPricing(provider, model)` to look up per-token rates. The pricing table includes Claude (Opus 4, Sonnet 4, Haiku 4, 3.5 Sonnet, 3.5 Haiku) and OpenAI (GPT-4o, GPT-4.1, o3, o4-mini, and variants). Lookup uses longest-prefix matching with provider-level fallbacks.

### Redis key structure

Counters are stored as Redis keys with the pattern:

```
user:{userId}:quota:{quotaType}:used    — cumulative usage (INCRBY)
user:{userId}:quota:{quotaType}:limit   — configured limit (-1 = unlimited)
```

If no `limit` key exists in Redis, the quota is blocked by default. Set the limit key to `-1` for unlimited access.

### Fail-open behavior

If Redis is unreachable, both `checkQuota` and `report` fail open — the tool call proceeds and a warning is logged.

### Registering a custom calculator

Inject `QuotaCalculatorRegistry` and register from any module's `onModuleInit`:

```ts
import { Module, OnModuleInit } from '@nestjs/common';
import { ToolEnvelope, ToolExecutionContext } from '@loopstack/common';
import { QuotaCalculatorRegistry, ToolQuotaCalculator } from '@loopstack/quota';

class ApiCallQuotaCalculator implements ToolQuotaCalculator {
  quotaType = 'api-calls';

  calculateQuotaUsage(_context: ToolExecutionContext, _result: ToolEnvelope) {
    return { quotaType: this.quotaType, actualAmount: 1 };
  }
}

@Module({})
export class MyModule implements OnModuleInit {
  constructor(private readonly registry: QuotaCalculatorRegistry) {}

  onModuleInit() {
    this.registry.register('MyApiTool', new ApiCallQuotaCalculator());
  }
}
```

The registry key is the tool's **class name** (not the `@Tool({ name })` value).

## Configuration

### `QuotaModule.forRoot(options)`

| Option          | Type      | Default       | Description                                |
| --------------- | --------- | ------------- | ------------------------------------------ |
| `enabled`       | `boolean` | `false`       | Enable quota tracking and Redis connection |
| `redisHost`     | `string`  | `'localhost'` | Redis host                                 |
| `redisPort`     | `number`  | `6379`        | Redis port                                 |
| `redisPassword` | `string`  | —             | Redis password                             |

### Environment variables (`forRootAsync`)

| Variable               | Fallback         | Description               |
| ---------------------- | ---------------- | ------------------------- |
| `QUOTA_ENABLED`        | —                | Set to `'true'` to enable |
| `QUOTA_REDIS_HOST`     | `REDIS_HOST`     | Redis host                |
| `QUOTA_REDIS_PORT`     | `REDIS_PORT`     | Redis port                |
| `QUOTA_REDIS_PASSWORD` | `REDIS_PASSWORD` | Redis password            |

## Public API

- **Module:** `QuotaModule` — `forRoot(options)`, `forRootAsync()`
- **Services:** `QuotaClientService` — `checkQuota(userId, quotaType)`, `report(userId, quotaType, amount)`
- **Services:** `QuotaCalculatorRegistry` — `register(toolClassName, calculator)`, `get(toolClassName)`, `has(toolClassName)`
- **Interceptor:** `QuotaInterceptor` — auto-discovered via `@UseToolInterceptor({ priority: 50 })`
- **Calculators:** `AiGenerateTextQuotaCalculator` (quota type: `llm-cost`), `ProcessingTimeQuotaCalculator` (quota type: `processing-time-ms`)
- **Interfaces:** `ToolQuotaCalculator`, `QuotaClientServiceInterface`, `QuotaCheckResult`, `QuotaUsage`
- **Tokens:** `QUOTA_CLIENT_SERVICE`, `QUOTA_REDIS`
- **Utilities:** `getModelPricing(provider, model)`, `ModelPricing`

## Dependencies

| Package             | Role                                                                             |
| ------------------- | -------------------------------------------------------------------------------- |
| `@loopstack/common` | `ToolInterceptor`, `ToolExecutionContext`, `ToolEnvelope`, `@UseToolInterceptor` |
| `@nestjs/common`    | NestJS dependency injection                                                      |
| `ioredis`           | Redis client for quota counters                                                  |

## Related

- [LLM Providers](https://loopstack.ai/docs/build/ai/llm-providers) — how LLM tools report token usage metadata consumed by the quota calculator
- [@loopstack/claude-module](https://loopstack.ai/docs/registry/features/claude-module) — Claude integration whose tools are metered by the built-in `AiGenerateTextQuotaCalculator`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
