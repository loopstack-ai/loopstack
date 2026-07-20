---
title: Observability Examples
description: Workflow examples for observability in Loopstack — quota tracking, custom tool interceptors for tracing, custom quota calculators, and event-driven audit logging
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

| Example                                             | Studio title                                      | Description                                                                       |
| --------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Quota](#quota)                                     | `Observability - Quota Example`                   | Manual check + report usage with `@loopstack/quota`, Redis-backed when enabled    |
| [Tracing Interceptor](#tracing-interceptor)         | `Observability - Tracing Interceptor Example`     | Custom `ToolInterceptor` measuring every tool execution app-wide                  |
| [Custom Quota Calculator](#custom-quota-calculator) | `Observability - Custom Quota Calculator Example` | Custom `ToolQuotaCalculator` metering a tool automatically via `QuotaInterceptor` |
| [Audit Log](#audit-log)                             | `Observability - Audit Log Example`               | `@OnEvent` listener recording workflow & document lifecycle events                |

---

## Quota

Demonstrates the manual quota API of `@loopstack/quota`:

1. `quotaClient.checkQuota(userId, quotaType)` — verify available budget
2. Perform the (placeholder) operation if allowed
3. `quotaClient.report(userId, quotaType, amount)` — charge against the quota

When `QuotaModule.forRoot({ enabled: false })`, both calls no-op. Set `enabled: true` plus Redis connection options to enforce real limits. Note: with quota enabled, a user without a limit key in Redis is blocked by default.

Built-in quota types: `llm-cost` (LLM token cost in microcents) and `processing-time-ms` (tool execution time).

### Files

- `quota-example.workflow.ts` — workflow class

## Tracing Interceptor

Demonstrates writing a custom `ToolInterceptor`:

- `@UseToolInterceptor({ priority: 10 })` registers the class app-wide — the framework discovers it via NestJS `DiscoveryService`, no manual wiring
- The interceptor wraps **every** tool call (all modules), measures duration, and records entries in an injectable `ToolTraceService`
- The workflow runs a few `SimulateWorkTool` calls, then filters the trace by its own `workflowId` and renders a markdown table

Interceptors follow a chain pattern like NestJS interceptors: run logic before/after `next()`, transform results, short-circuit (caching), or catch errors. Lower priority runs first (outermost).

### Files

- `tracing-example.workflow.ts` — workflow class
- `interceptors/tracing.interceptor.ts` — the custom `ToolInterceptor`
- `services/tool-trace.service.ts` — injectable trace store
- `tools/simulate-work.tool.ts` — demo tool that sleeps for a configurable duration

## Custom Quota Calculator

Demonstrates extending the quota system with a custom `ToolQuotaCalculator`:

- `WordsProcessedQuotaCalculator` defines quota type `words-processed` and derives the charged amount from the tool result (word count)
- The module registers it for `AnalyzeTextTool` in `onModuleInit` via `QuotaCalculatorRegistry`
- The built-in `QuotaInterceptor` then checks the quota **before** and reports usage **after** every `AnalyzeTextTool` execution — the workflow just calls the tool, no manual check/report

This is the recommended pattern for metering tools: the workflow stays clean, enforcement lives in the interceptor.

### Files

- `custom-calculator-example.workflow.ts` — workflow class
- `calculators/words-processed.calculator.ts` — the custom `ToolQuotaCalculator`
- `tools/analyze-text.tool.ts` — demo tool whose usage is metered

## Audit Log

Demonstrates subscribing to framework events for monitoring:

- The framework dispatches lifecycle events on the `client.message` channel — e.g. `workflow.created`, `workflow.updated`, `document.created`
- `AuditListener` uses `@OnEvent('client.message')` to capture every event into an injectable `AuditLogService` (bounded in-memory store)
- The workflow saves a few documents to generate events, then renders its own audit trail filtered by `workflowId`

This is the event-driven counterpart to the tracing interceptor: interceptors wrap tool calls, event listeners observe workflow and document lifecycle. Swap the in-memory store for a database or metrics exporter in production.

### Files

- `audit-log-example.workflow.ts` — workflow class
- `listeners/audit.listener.ts` — the `@OnEvent` listener
- `services/audit-log.service.ts` — injectable audit store

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
