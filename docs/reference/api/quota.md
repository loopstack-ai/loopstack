---
title: 'API: @loopstack/quota'
description: 'Public API reference for @loopstack/quota'
includeInLlmsFullTxt: false
---

# API: @loopstack/quota

## Classes

### QuotaClientService

Service that reads and reports Redis-backed quota counters; inject it to check usage or report consumption.

```ts
import { QuotaClientService } from '@loopstack/quota';
```

**Provided by:** `QuotaModule`

```ts
export class QuotaClientService implements QuotaClientServiceInterface {
  constructor(redis: Redis | null);
  checkQuota(userId: string, quotaType: string): Promise<QuotaCheckResult>;
  report(userId: string, quotaType: string, amount: number): Promise<void>;
}
```

### QuotaModule

NestJS module that provides opt-in quota tracking and enforcement for tool calls — the
`QuotaInterceptor`, `QuotaClientService`, `QuotaCalculatorRegistry`, and built-in
AI-cost and processing-time calculators.

Registration:

- `QuotaModule.forRoot(QuotaModuleOptions)` — use when you configure the module in code; sets the
  `enabled` flag and the Redis connection (`redisHost`/`redisPort`/`redisPassword`) explicitly and
  registers the module globally.
- `QuotaModule.forRootAsync()` — use when configuration comes from the environment at runtime; reads
  `QUOTA_ENABLED`, `QUOTA_REDIS_HOST` (fallback `REDIS_HOST`), `QUOTA_REDIS_PORT` (fallback
  `REDIS_PORT`), and `QUOTA_REDIS_PASSWORD` (fallback `REDIS_PASSWORD`), then delegates to `forRoot`.

Requires: a reachable Redis instance when `enabled: true` (usage counters are Redis-backed). When
`enabled` is `false` (the default), the Redis connection is skipped and the interceptor is a no-op.

```ts
import { QuotaModule } from '@loopstack/quota';
```

```ts
export class QuotaModule implements OnModuleInit {
  constructor(calculatorRegistry: QuotaCalculatorRegistry);
  onModuleInit(): void;
  static forRoot(options?: QuotaModuleOptions): DynamicModule;
  static forRootAsync(): DynamicModule;
}
```

## Interfaces

### QuotaModuleOptions

Options for `QuotaModule.forRoot()` — toggles quota tracking and configures the Redis connection.

```ts
import { QuotaModuleOptions } from '@loopstack/quota';
```

```ts
export interface QuotaModuleOptions {
  enabled: boolean;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
}
```

## Type Aliases

### QuotaCheckResult

Result of `QuotaClientService.checkQuota()` — whether the limit is exceeded plus current used and limit values.

```ts
import { QuotaCheckResult } from '@loopstack/quota';
```

```ts
export type QuotaCheckResult = {
  exceeded: boolean;
  used: number;
  limit: number;
};
```
