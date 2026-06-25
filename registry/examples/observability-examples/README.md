---
title: Observability Examples
description: Workflow examples for observability in Loopstack — opt-in quota tracking and enforcement
---

# @loopstack/observability-examples

> Observability workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Workflow examples for tracking and enforcing operational limits.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/observability-examples src/observability-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { ObservabilityExamplesModule } from './observability-examples/observability-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), ObservabilityExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/observability-examples
```

```typescript
import { ObservabilityExamplesModule } from '@loopstack/observability-examples';
```

## Examples

| Example         | Studio title                    | Description                                                             |
| --------------- | ------------------------------- | ----------------------------------------------------------------------- |
| [Quota](#quota) | `Observability - Quota Example` | Check + report usage with `@loopstack/quota`, Redis-backed when enabled |

---

## Quota

Demonstrates opt-in quota tracking using `@loopstack/quota`:

1. `quotaClient.checkQuota(userId, quotaType)` — verify available budget
2. Perform the (placeholder) operation if allowed
3. `quotaClient.report(userId, quotaType, amount)` — charge against the quota

When `QuotaModule.forRoot({ enabled: false })`, both calls no-op. Set `enabled: true` plus Redis connection options to enforce real limits.

### Files

- `quota-example.workflow.ts` — workflow class

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
