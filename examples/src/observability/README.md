---
title: Observability Examples
description: Workflow examples for observability in Loopstack — quota tracking, custom tool interceptors for tracing, custom quota calculators, event-driven audit logging, and reading a run's checkpoint history with client.workflows.checkpoints and loopstack runs
---

# Observability Examples

> Observability workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Workflow examples for tracking and enforcing operational limits.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/common @loopstack/quota
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { ObservabilityExamplesModule } from './observability/observability-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), ObservabilityExamplesModule],
})
export class AppModule {}
```

## Examples

| Example                                             | Studio title                                      | Description                                                                       |
| --------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Quota](#quota)                                     | `Observability - Quota Example`                   | Manual check + report usage with `@loopstack/quota`, Redis-backed when enabled    |
| [Tracing Interceptor](#tracing-interceptor)         | `Observability - Tracing Interceptor Example`     | Custom `ToolInterceptor` measuring every tool execution app-wide                  |
| [Custom Quota Calculator](#custom-quota-calculator) | `Observability - Custom Quota Calculator Example` | Custom `ToolQuotaCalculator` metering a tool automatically via `QuotaInterceptor` |
| [Audit Log](#audit-log)                             | `Observability - Audit Log Example`               | `@OnEvent` listener recording workflow & document lifecycle events                |
| [Checkpoints](#checkpoints)                         | `Observability - Checkpoints Example`             | A branching run whose checkpoint history you read with the SDK or the CLI         |

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

## Checkpoints

Demonstrates reading a run's **checkpoint history** after the fact — which places the run passed, which transitions moved it, and when:

- The workflow stores an `amount`, then a `@Guard` routes it to `approved` (amount ≤ 500, the default is 250) or to `flagged`, and the run ends
- The engine persists a checkpoint row as the run moves; the history of those rows is the run's path
- `scripts/checkpoints-demo.mjs` starts the run through `@loopstack/client` and prints the history

Each history entry has six fields: `id`, `place`, `transitionId`, `transitionFrom`, `version` and `createdAt`. The history does **not** include the state or the documents at each step — it shows the path and its timing. For what happened inside a step, read the run trace (`loopstack run --trace`, then `client.workflows.toolCalls(id)` or `loopstack runs <run-id> --record`); for lifecycle events, see the [Audit Log](#audit-log) example.

### Reading the history

With the CLI, `loopstack runs <run-id>` folds the history into one step line per place, with the time spent there:

```text
$ loopstack run checkpoints_example
$ loopstack runs <run-id>
checkpoints_example #1 — completed
✓ start (3ms)
✓ received (18ms)
✓ approved (7ms)
```

`loopstack runs <run-id> --json` prints the raw rows under `checkpoints`. From code, use the client SDK — or the React hook in a frontend:

```typescript
const checkpoints = await client.workflows.checkpoints(runId); // @loopstack/client
const { data: checkpoints } = useWorkflowCheckpoints(runId); // @loopstack/react
```

`node scripts/checkpoints-demo.mjs` does the same against the running app (`node scripts/checkpoints-demo.mjs 900` takes the `flagged` branch):

```text
┌─────────┬─────────┬────────────┬────────────────┬──────────────────┐
│ (index) │ version │ place      │ transitionFrom │ transitionId     │
├─────────┼─────────┼────────────┼────────────────┼──────────────────┤
│ 0       │ 1       │ 'start'    │ 'start'        │ 'receive'        │
│ 1       │ 2       │ 'received' │ 'start'        │ 'receive'        │
│ 2       │ 2       │ 'received' │ 'received'     │ 'autoApprove'    │
│ 3       │ 3       │ 'approved' │ 'received'     │ 'autoApprove'    │
│ 4       │ 3       │ 'approved' │ 'approved'     │ 'finishApproved' │
│ 5       │ 4       │ 'end'      │ 'approved'     │ 'finishApproved' │
│ 6       │ 4       │ 'end'      │ 'approved'     │ 'finishApproved' │
└─────────┴─────────┴────────────┴────────────────┴──────────────────┘
```

(`createdAt` is left out above for width.) The rows come in pairs, one pair per transition:

- **When a transition starts**, a row is written at the place it leaves (`place` = `transitionFrom`), with the same `version` as the row before it
- **When it lands**, a row is written at the new place, with `version` one higher
- **When the run settles** at the end of a processing step, one more row records the place it settled on — here `end`

So `version` grows by one per completed transition, not per row, and consecutive rows of one place belong together — which is why the CLI folds them into one step line.

### Files

- `checkpoints-example.workflow.ts` — workflow class
- `scripts/checkpoints-demo.mjs` (in the examples app) — reads the history through `@loopstack/client`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
