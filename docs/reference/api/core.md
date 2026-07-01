---
title: API: @loopstack/core
description: Public API reference for @loopstack/core
includeInLlmsFullTxt: false
---

# API: @loopstack/core

## Classes

### FanOutWorkflow

Workflow that launches N sub-workflows in parallel, awaits all of them, and fires a
single aggregated callback to the parent.

Sub-workflows are referenced by their canonical name (string) — set via `@Workflow({ name })`
or auto-derived from the class name. Items may be passed as an array or a keyed record.

Modes:

- `'all'` (default) — first failure cancels in-flight siblings; the callback fires once
  every child has settled (canceled siblings also send callbacks).
- `'allSettled'` — every child runs to completion; the callback aggregates all results.

```ts
import { FanOutWorkflow } from '@loopstack/core';
```

**Provided by:** `LoopCoreModule`

```ts
export class FanOutWorkflow extends BaseWorkflow<FanOutArgs, FanOutInput> {
  constructor(orchestrator: WorkflowOrchestrator, registry: WorkflowRegistryService);
  start(state: FanOutState, ctx: RunContext<FanOutArgs>): Promise<void>;
  onChildComplete(
    state: FanOutState,
    input: TransitionInput<
      unknown,
      {
        key?: string;
      }
    >,
    ctx: RunContext<FanOutArgs>,
  ): Promise<void>;
  done(state: FanOutState): void;
}
```

### SequenceWorkflow

Workflow that runs N sub-workflows one at a time, awaits each, and fires a single
aggregated callback to the parent.

Sub-workflows are referenced by their canonical name (string) — set via `@Workflow({ name })`
or auto-derived from the class name. Items may be passed as an array or a keyed record.

Modes:

- `'all'` (default) — first failure aborts the sequence; remaining items are marked as
  `'skipped'` in the result.
- `'allSettled'` — every item runs regardless of prior failures.

```ts
import { SequenceWorkflow } from '@loopstack/core';
```

**Provided by:** `LoopCoreModule`

```ts
export class SequenceWorkflow extends BaseWorkflow<SequenceArgs, SequenceInput> {
  constructor(orchestrator: WorkflowOrchestrator, registry: WorkflowRegistryService);
  start(state: SequenceState, ctx: RunContext<SequenceArgs>): Promise<void>;
  onChildComplete(state: SequenceState, input: TransitionInput, ctx: RunContext<SequenceArgs>): Promise<void>;
  done(state: SequenceState): void;
}
```

### WorkflowRunner

Service for starting workflows from code (API requests, webhooks, cron jobs,
delayed timeouts, batch fan-out) instead of the Studio "Run" button. Inject it
anywhere — it is globally available once `LoopstackModule.forRoot()` is imported.

- `run(WorkflowClass, args, options)` — enqueue on BullMQ and return a `RunResult` (`workflowId`).
- `runSync(WorkflowClass, args, options)` — execute inline and await a `SyncRunResult`; pass `{ stateless: true }` to skip persistence.
- `execute(workflow, payload, options)` — controller-facing entry that starts, resumes, or retries based on the payload.
- `runById(workflowId, userId, options)` — resume/re-run an existing workflow by id.

```ts
import { WorkflowRunner } from '@loopstack/core';
```

```ts
export class WorkflowRunner {
  constructor(
    configService: ConfigService,
    createWorkflowService: CreateWorkflowService,
    workspaceService: WorkspaceService,
    workflowService: WorkflowService,
    taskSchedulerService: TaskSchedulerService,
    rootProcessorService: RootProcessorService,
    workflowRegistryService: WorkflowRegistryService,
    orchestrator: WorkflowOrchestrator,
  );
  execute<TArgs>(
    workflow: Type<BaseWorkflow<TArgs>> | string,
    payload: WorkflowPayload<TArgs>,
    options: {
      userId: string;
      appName: string;
      labels?: string[];
    },
  ): Promise<WorkflowRunResult>;
  run<W extends BaseWorkflow>(
    workflow: Type<W>,
    args: WorkflowArgs<W>,
    options: WorkflowRunnerOptions,
  ): Promise<RunResult>;
  runSync<W extends BaseWorkflow>(
    workflow: Type<W>,
    args: WorkflowArgs<W>,
    options: WorkflowRunnerSyncOptions,
  ): Promise<SyncRunResult | StatelessRunResult>;
  runById(
    workflowId: string,
    userId: string,
    payload?: {
      transition?: {
        id: string;
        workflowId?: string;
        payload?: unknown;
      };
    },
  ): Promise<RunResult>;
  cancel(workflowId: string, userId: string): Promise<void>;
}
```

## Type Aliases

### FanOutArgs

Validated/persisted args for `FanOutWorkflow` (the parsed form of `FanOutInput`).

```ts
import { FanOutArgs } from '@loopstack/core';
```

```ts
export type FanOutArgs = z.output<typeof FanOutArgsSchema>;
```

### FanOutInput

Call-site input for `FanOutWorkflow.run()` — the workflow to fan out, the items
(array or keyed record), and the `mode` (`'all'` | `'allSettled'`).

```ts
import { FanOutInput } from '@loopstack/core';
```

```ts
export type FanOutInput = z.input<typeof FanOutArgsSchema>;
```

### SequenceArgs

Validated/persisted args for `SequenceWorkflow` (the parsed form of `SequenceInput`).

```ts
import { SequenceArgs } from '@loopstack/core';
```

```ts
export type SequenceArgs = z.output<typeof SequenceArgsSchema>;
```

### SequenceInput

Call-site input for `SequenceWorkflow.run()` — the workflow to run, the items
(array or keyed record), and the `mode` (`'all'` | `'allSettled'`).

```ts
import { SequenceInput } from '@loopstack/core';
```

```ts
export type SequenceInput = z.input<typeof SequenceArgsSchema>;
```

## Variables

### FanOutResultSchema

Zod schema for the aggregated `FanOutWorkflow` result delivered as the `data` field of the
`TransitionInput` in a parent's callback.

Fields:

- `results` — an array of entries (each with a `key`) if items were an array, otherwise a
  keyed record of entries; every entry carries a `status`, optional `data`, and optional `error`.
- `hasErrors` — true when any child did not complete successfully.
- `errorCount` — number of children that did not complete successfully.

```ts
import { FanOutResultSchema } from '@loopstack/core';
```

```ts
FanOutResultSchema: z.ZodObject<
  {
    results: z.ZodUnion<
      readonly [
        z.ZodArray<
          z.ZodObject<
            {
              status: z.ZodEnum<{
                completed: 'completed';
                failed: 'failed';
                canceled: 'canceled';
              }>;
              data: z.ZodOptional<z.ZodUnknown>;
              error: z.ZodOptional<z.ZodString>;
              key: z.ZodString;
            },
            z.core.$strip
          >
        >,
        z.ZodRecord<
          z.ZodString,
          z.ZodObject<
            {
              status: z.ZodEnum<{
                completed: 'completed';
                failed: 'failed';
                canceled: 'canceled';
              }>;
              data: z.ZodOptional<z.ZodUnknown>;
              error: z.ZodOptional<z.ZodString>;
            },
            z.core.$strip
          >
        >,
      ]
    >;
    hasErrors: z.ZodBoolean;
    errorCount: z.ZodNumber;
  },
  z.core.$strip
>;
```

### SequenceResultSchema

Zod schema for the aggregated `SequenceWorkflow` result delivered as the `data` field of the
`TransitionInput` in a parent's callback.

Fields:

- `results` — an array of entries (each with a `key`) if items were an array, otherwise a
  keyed record of entries; every entry carries a `status`, optional `data`, and optional `error`.
- `hasErrors` — true when any item did not complete successfully.
- `errorCount` — number of items that did not complete successfully.

```ts
import { SequenceResultSchema } from '@loopstack/core';
```

```ts
SequenceResultSchema: z.ZodObject<
  {
    results: z.ZodUnion<
      readonly [
        z.ZodArray<
          z.ZodObject<
            {
              status: z.ZodEnum<{
                completed: 'completed';
                failed: 'failed';
                canceled: 'canceled';
                skipped: 'skipped';
              }>;
              data: z.ZodOptional<z.ZodUnknown>;
              error: z.ZodOptional<z.ZodString>;
              key: z.ZodString;
            },
            z.core.$strip
          >
        >,
        z.ZodRecord<
          z.ZodString,
          z.ZodObject<
            {
              status: z.ZodEnum<{
                completed: 'completed';
                failed: 'failed';
                canceled: 'canceled';
                skipped: 'skipped';
              }>;
              data: z.ZodOptional<z.ZodUnknown>;
              error: z.ZodOptional<z.ZodString>;
            },
            z.core.$strip
          >
        >,
      ]
    >;
    hasErrors: z.ZodBoolean;
    errorCount: z.ZodNumber;
  },
  z.core.$strip
>;
```
