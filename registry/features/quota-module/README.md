# @loopstack/quota

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

Opt-in quota tracking and enforcement for Loopstack tool calls. Backed by Redis; ships with calculators for AI token usage and processing time.

## Overview

Loopstack workflows can call arbitrarily many tools, and some of those tools (especially AI-generation ones) incur real cost. The Quota module gives you a consistent way to meter those costs and optionally reject calls once a user or workspace hits a limit. It hooks in as a NestJS interceptor, so you don't need to thread quota checks through your tool code.

By using this module you'll get:

- **`QuotaInterceptor`** — automatically discovered via `@UseToolInterceptor()`; runs on every tool call
- **`QuotaCalculatorRegistry`** — maps tool names to calculator implementations; ships with `AiGenerateTextQuotaCalculator` registered for `AiGenerateText`, `AiGenerateObject`, `AiGenerateDocument`, `ClaudeGenerateText`, `ClaudeGenerateObject`, `ClaudeGenerateDocument`
- **`AiGenerateTextQuotaCalculator`** — computes cost from Claude token usage (input / output tokens)
- **`ProcessingTimeQuotaCalculator`** — computes cost from wall-clock time
- **`QuotaClientService`** — increment / read quota counters directly if you need custom logic

## Installation

```sh
npm install @loopstack/quota
```

Register the module globally using `forRoot` or `forRootAsync`:

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

Or read configuration from env vars:

```ts
imports: [QuotaModule.forRootAsync()];
```

`forRootAsync()` reads `QUOTA_ENABLED`, `QUOTA_REDIS_HOST` (or `REDIS_HOST`), `QUOTA_REDIS_PORT` (or `REDIS_PORT`), and `QUOTA_REDIS_PASSWORD` (or `REDIS_PASSWORD`).

When `enabled: false` (the default), the Redis connection is skipped and the interceptor becomes a no-op — safe to leave wired up in dev and local setups.

## How It Works

### Registering a calculator for your own tool

Inject the registry and register a calculator from any module that runs `onModuleInit`:

```ts
import { Module, OnModuleInit } from '@nestjs/common';
import { QuotaCalculatorRegistry, ToolQuotaCalculator } from '@loopstack/quota';

class MyCustomQuotaCalculator implements ToolQuotaCalculator {
  calculate(result: unknown): number {
    return 1; // e.g. 1 quota unit per call
  }
}

@Module({})
export class MyModule implements OnModuleInit {
  constructor(private readonly registry: QuotaCalculatorRegistry) {}

  onModuleInit() {
    this.registry.register('MyCustomTool', new MyCustomQuotaCalculator());
  }
}
```

### Reading current usage

Inject `QuotaClientService` (or the `QUOTA_CLIENT_SERVICE` token) and query the counter for a user / workspace identifier — see `src/services/quota-client.service.ts` for the method surface.

## Public API

- **Module:** `QuotaModule.forRoot(options)`, `QuotaModule.forRootAsync()`
- **Services:** `QuotaClientService`, `QuotaCalculatorRegistry`
- **Interceptor:** `QuotaInterceptor` (auto-wired)
- **Calculators:** `AiGenerateTextQuotaCalculator`, `ProcessingTimeQuotaCalculator`
- **Tokens:** `QUOTA_CLIENT_SERVICE`, `QUOTA_REDIS`

## Dependencies

- `@loopstack/common` — types and decorators
- `ioredis` — Redis client
- `@nestjs/common` — DI

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- Find more Loopstack modules in the [Loopstack Registry](https://loopstack.ai/registry)
