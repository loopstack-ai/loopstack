---
title: 'API: @loopstack/common'
description: 'Public API reference for @loopstack/common'
includeInLlmsFullTxt: false
---

# API: @loopstack/common

## Classes

### BaseTool

Abstract base class for tools.

Tool authors extend this class and implement `handle(args, ctx, options?)`.
Consumers call `tool.call(args, options?)` — the base class routes through
`ToolPipelineService` which handles validation, config merging, and interceptors.

```ts
import { BaseTool } from '@loopstack/common';
```

```ts
export abstract class BaseTool<
  TArgs extends object = object,
  TConfig extends object = object,
  TResult = unknown,
  TMeta = Record<string, unknown>,
> {
  protected readonly documentStore: DocumentStore;
  protected readonly render: TemplateRenderFn;
  call(args?: TArgs, options?: ToolCallOptions<TConfig>): Promise<ToolResult<TResult, TMeta>>;
  protected abstract handle(
    args: TArgs,
    ctx: RunContext,
    options?: ToolCallOptions<TConfig>,
  ): Promise<ToolEnvelope<TResult, TMeta>>;
  complete(result: Record<string, unknown>): Promise<ToolEnvelope>;
}
```

### BaseWorkflow

Abstract base class for workflows.

Generic parameters:

- `TArgs` — the **storage contract**: what is validated, persisted, and arrives in `ctx.args`
  inside transitions (via `ctx: RunContext<TArgs>`).
- `TInput` — the **call-site contract**: what callers pass to `run(input)`. Defaults to `TArgs`,
  so workflows whose call shape equals their storage shape only need a single generic.

The two diverge when the workflow's `@Workflow({ schema })` is a transforming zod schema
(`schema.transform(input => args)`). In that case, infer the types from the schema:
`BaseWorkflow<z.output<typeof Schema>, z.input<typeof Schema>>`.

State and result are mutated via setters, never via the return value:

- `this.assignState(partial)` — shallow-merge into state
- `this.setState(full)` — replace state
- `this.assignResult(partial)` — shallow-merge into result
- `this.setResult(full)` — replace result

Transitions return nothing. Returning a non-undefined value throws at runtime.
Use `async` only when the body awaits. Setters are immediately visible to
subsequent code in the same transition; on error, the framework discards the
draft as part of the transition rollback.

Workflows are singletons. State flows through the `state` parameter:

- All transitions receive `(state, ctx)` and return nothing
- Wait transitions receive `(state, payload, ctx)` and return nothing
- `ctx` is optional (trailing param can be omitted)
- Args are available via `ctx.args` — type with `RunContext<TArgs>` to drop the cast
- Use `from: 'start'` (or omit `from`) for initial, `to: 'end'` for final

Launch sub-workflows by injecting the workflow class and calling `run()` with a
`callback.transition` that resumes the parent when the child completes.

```ts
import { BaseWorkflow } from '@loopstack/common';
```

```ts
export abstract class BaseWorkflow<TArgs = Record<string, unknown>, TInput = TArgs> {
  protected readonly documentStore: DocumentStore;
  protected readonly render: TemplateRenderFn;
  run(input?: TInput, options?: RunOptions): Promise<QueueResult>;
  protected assignState(partial: Record<string, unknown>): void;
  protected setState(next: Record<string, unknown>): void;
  protected assignResult(partial: Record<string, unknown>): void;
  protected setResult(next: Record<string, unknown>): void;
}
```

### ErrorDocument

Document that renders an error message in Studio.

```ts
import { ErrorDocument } from '@loopstack/common';
```

```ts
export class ErrorDocument {
  error: string;
}
```

### MarkdownDocument

Document that renders Markdown content in Studio.

```ts
import { MarkdownDocument } from '@loopstack/common';
```

```ts
export class MarkdownDocument {
  markdown: string;
}
```

### MessageDocument

Document that renders a chat message (`role` plus optional `text`) in Studio.

```ts
import { MessageDocument } from '@loopstack/common';
```

```ts
export class MessageDocument {
  role: string;
  text?: string;
}
```

### PlainDocument

Document that renders plain text in Studio.

```ts
import { PlainDocument } from '@loopstack/common';
```

```ts
export class PlainDocument {
  text: string;
}
```

### ServerTool

Abstract base class for server-side tools — tools executed by the LLM provider
rather than locally by the framework.

Server tools (e.g. Anthropic's `web_search`, `code_execution`) are configured
at API call time and the provider handles execution. The framework passes the
validated config from `toServerToolConfig` directly to the provider.

Use the standard `@Tool()` decorator for metadata and constructor injection.
Configuration from `options.config` is validated against the
`configSchema` and passed as the `config` argument to `toServerToolConfig`.

```ts
import { ServerTool } from '@loopstack/common';
```

```ts
export abstract class ServerTool<TConfig extends object = object> {
  abstract toServerToolConfig(config?: TConfig): unknown;
}
```

## Interfaces

### DocumentOptions

Options for the `@Document()` decorator.

```ts
import { DocumentOptions } from '@loopstack/common';
```

```ts
export interface DocumentOptions {
  name?: string;
  title?: string;
  description?: string;
  widget?: WidgetRef | WidgetRef[];
  schema?: z.ZodType;
  tags?: string[];
  meta?: StaticDocumentMeta;
  internal?: boolean;
}
```

### DocumentStore

Document store for workflow and tool authors — `create`, `save`, and lookup of
typed documents that render in Studio.

Available as `this.documentStore` on `BaseWorkflow` and `BaseTool` (no manual
injection needed).

```ts
import { DocumentStore } from '@loopstack/common';
```

```ts
export interface DocumentStore {
  create<T extends object>(documentClass: DocumentClass<T>, data: T): T;
  save<T extends object>(
    classOrInstance: DocumentClass<T> | T,
    dataOrOptions?: T | DocumentSaveOptions,
    maybeOptions?: DocumentSaveOptions,
  ): Promise<DocumentEntity>;
  findAll<T extends object>(documentClass: DocumentClass<T>): T[];
  findAllDocuments(): DocumentEntity[];
  findByTag(tag: string): DocumentEntity[];
}
```

### RunContext

Unified per-job framework context.

Used by both tools (passed as `ctx` parameter to `handle()`) and workflows
(passed as the trailing parameter to transition methods).

- `args` — validated workflow input args (frozen at job start)
- `execution` — present in workflow transitions, absent in tools

```ts
import { RunContext } from '@loopstack/common';
```

```ts
export interface RunContext<TArgs = unknown> {
  userId: string;
  workspaceId: string;
  workflowId: string;
  args: TArgs;
  execution?: {
    place: string;
    retryCount: number;
  };
}
```

### RunResult

Result of `WorkflowRunner.run` — a workflow enqueued via BullMQ.

```ts
import { RunResult } from '@loopstack/common';
```

```ts
export interface RunResult {
  workflowId: string;
  workspaceId: string;
  workerId: string;
}
```

### StatelessRunResult

Result of a stateless `WorkflowRunner.runSync` (no persistence) — `status` and published `result`.

```ts
import { StatelessRunResult } from '@loopstack/common';
```

```ts
export interface StatelessRunResult {
  status: WorkflowState;
  result: unknown;
}
```

### StudioAppOptions

Options for the `@StudioApp()` decorator — the app identity, title, workflows,
and UI config that make a module appear as a launchable app in Studio.

```ts
import { StudioAppOptions } from '@loopstack/common';
```

```ts
export interface StudioAppOptions {
  app?: string;
  title: string;
  description?: string;
  ui?: StudioUiConfig;
  workflows?: Type<BaseWorkflow<any>>[];
}
```

### SyncRunResult

Result of `WorkflowRunner.runSync` with persistence — the final `status` and published `result`.

```ts
import { SyncRunResult } from '@loopstack/common';
```

```ts
export interface SyncRunResult extends RunResult {
  status: WorkflowState;
  result: unknown;
}
```

### ToolCallOptions

Options passed as the second argument to `BaseTool.call()`.

```ts
import { ToolCallOptions } from '@loopstack/common';
```

```ts
export interface ToolCallOptions<TConfig = object> {
  callback?: {
    transition: string;
    metadata?: Record<string, unknown>;
  };
  config?: TConfig;
}
```

### ToolOptions

Options for the `@Tool()` decorator.

```ts
import { ToolOptions } from '@loopstack/common';
```

```ts
export interface ToolOptions {
  name?: string;
  description?: string;
  widget?: WidgetRef | WidgetRef[];
  schema?: z.ZodType;
  configSchema?: z.ZodType;
}
```

### ToolResult

Narrowed success-path return of `BaseTool.call()`.

`data` and `metadata` are non-optional — `call()` throws when the underlying envelope carries
`error` or `pending`, so workflow authors never observe those states from this API.

```ts
import { ToolResult } from '@loopstack/common';
```

```ts
export interface ToolResult<TData = unknown, TMeta = Record<string, unknown>> {
  data: TData;
  metadata: TMeta;
  type?: 'text' | 'image' | 'file';
}
```

### TransitionInput

Shape delivered to every `@Transition({ wait: true })` method, regardless of trigger source
(sub-workflow completion or frontend / API resume).

The `schema` option on `@Transition` validates `data` only — the framework constructs the
surrounding envelope. `meta` carries whatever the parent passed to `callback.metadata`
(used by `FanOut`/`Sequence` for per-child correlation, by the LLM tool loop for
`toolUseId`, etc.); it is `undefined` for user-driven resumes.

`hasError` / `errorMessage` / `status` reflect the terminal state of the trigger so the
receiver can branch on failure without separate lookups.

```ts
import { TransitionInput } from '@loopstack/common';
```

```ts
export interface TransitionInput<TData = unknown, TMeta = unknown> {
  workflowId: string;
  status: 'completed' | 'failed' | 'canceled';
  hasError: boolean;
  errorMessage: string | null;
  data: TData;
  meta?: TMeta;
}
```

### TransitionOptions

Options for the `@Transition()` decorator — routing (`from`/`to`), `wait`,
`priority`, the payload/args `schema`, and the retry / error-place / timeout
controls.

```ts
import { TransitionOptions } from '@loopstack/common';
```

```ts
export interface TransitionOptions {
  from?: string;
  to: string;
  wait?: boolean;
  priority?: number;
  schema?: z.ZodType;
  retryAttempts?: number;
  retryDelay?: number;
  retryBackoff?: 'fixed' | 'exponential';
  retryMaxDelay?: number;
  retryTarget?: string;
  errorPlace?: string;
  timeout?: number;
}
```

### WorkflowOptions

Options for the `@Workflow()` decorator.

```ts
import { WorkflowOptions } from '@loopstack/common';
```

```ts
export interface WorkflowOptions {
  name?: string;
  title?: string;
  description?: string;
  widget?: WidgetRef | WidgetRef[];
  schema?: z.ZodType;
  configSchema?: z.ZodType;
  stateSchema?: z.ZodType;
}
```

### WorkflowRunnerOptions

Options for starting a workflow via `WorkflowRunner` (`run` / `runSync`) —
`userId`, `appName`, and optional `workspaceId` / `labels`.

```ts
import { WorkflowRunnerOptions } from '@loopstack/common';
```

```ts
export interface WorkflowRunnerOptions {
  userId: string;
  appName: string;
  workspaceId?: string;
  labels?: string[];
}
```

### WorkflowRunnerSyncOptions

Options for `WorkflowRunner.runSync` — extends `WorkflowRunnerOptions` with
`stateless` to skip all DB persistence.

```ts
import { WorkflowRunnerSyncOptions } from '@loopstack/common';
```

```ts
export interface WorkflowRunnerSyncOptions extends WorkflowRunnerOptions {
  stateless?: boolean;
}
```

## Type Aliases

### ToolEnvelope

Raw envelope returned by `BaseTool.handle()` and `ToolPipeline.execute()`.

Models all three legitimate tool outcomes:

- success: `data` (+ optional `metadata`, `type`)
- recoverable failure: `error` (read by the LLM agent tool-call loop and packaged as `is_error: true`)
- async pending: `pending` (the tool launched a sub-workflow; result arrives via callback)

Tool authors return this shape from `handle()`. Consumers go through `BaseTool.call()`, which
returns the narrowed `ToolResult` and throws on `error` / `pending`.

```ts
import { ToolEnvelope } from '@loopstack/common';
```

```ts
export type ToolEnvelope<TData = unknown, TMeta = Record<string, unknown>> = {
  type?: 'text' | 'image' | 'file';
  data?: TData;
  error?: string;
  metadata?: TMeta;
  pending?: {
    workflowId: string;
  };
};
```

### WorkflowArgs

Extracts the `TArgs` type from a `BaseWorkflow` subclass — the args shape you
pass to `WorkflowRunner.run(WorkflowClass, args, …)`.

```ts
import { WorkflowArgs } from '@loopstack/common';
```

```ts
export type WorkflowArgs<W> = W extends BaseWorkflow<infer A> ? A : never;
```

## Functions

### Document

Marks a class as a Document DTO.

Unlike `@Tool` and `@Workflow`, documents are NOT injectable NestJS providers —
they are plain data classes. Their schema, widget, and meta are read from
decorator metadata when documents are saved via `documentStore.save(DocClass, …)`.

Identifier resolution: `options.name` ?? class name with `Document` suffix
stripped, snake_cased (e.g. `AskUserDocument` → `ask_user`).

```ts
import { Document } from '@loopstack/common';
```

```ts
export function Document(options?: DocumentOptions): ClassDecorator;
```

### Guard

Gates a transition behind a guard predicate method.

`guardMethodName` names a pure, side-effect-free method on the workflow that
returns a boolean. When several transitions share a `from` place, the
highest-priority transition whose guard returns true is the one that fires.

```ts
import { Guard } from '@loopstack/common';
```

```ts
export function Guard(guardMethodName: string): MethodDecorator;
```

### StudioApp

Marks a NestJS module as a Loopstack App — the single source of truth
for app identity, UI config, and developer-defined settings.

```ts
import { StudioApp } from '@loopstack/common';
```

```ts
export function StudioApp(options: StudioAppOptions): ClassDecorator;
```

### Tool

Marks a class as a Loopstack tool. The class must extend `BaseTool`.

Also applies `@Injectable()` so the tool can be registered as a NestJS provider
and constructor-injected into workflows and other tools.

Identifier resolution: `options.name` ?? class name (as-is). Always set
`options.name` to a snake_case identifier — it appears in the LLM tool-calling
wire format.

Relative `widget:` paths (`./foo.ui.yaml`, `../shared/foo.ui.yaml`) are resolved
against this file's directory at decorator-evaluation time.

```ts
import { Tool } from '@loopstack/common';
```

```ts
export function Tool(options?: ToolOptions): ClassDecorator;
```

### Transition

Marks a workflow method as a transition between two states (places).

The method fires when the workflow is in its `from` place and moves it to `to`.
`from` defaults to `'start'` (the initial transition); use `to: 'end'` for the
final transition. Set `wait: true` to pause until an external trigger (user
input or a sub-workflow callback) resumes the workflow. Transitions mutate
state via setters and return nothing.

```ts
import { Transition } from '@loopstack/common';
```

```ts
export function Transition(options: TransitionOptions): MethodDecorator;
```

### Workflow

Marks a class as a Loopstack workflow. The class must extend `BaseWorkflow`.

Also applies `@Injectable()` so the workflow can be registered as a NestJS provider
and constructor-injected (tools, sub-workflows, services).

Identifier resolution: `options.name` ?? class name with `Workflow` suffix stripped,
snake_cased (e.g. `ChatWorkflow` → `chat`).

Relative `widget:` paths (`./foo.ui.yaml`, `../shared/foo.ui.yaml`) are resolved
against this file's directory at decorator-evaluation time.

```ts
import { Workflow } from '@loopstack/common';
```

```ts
export function Workflow(options?: WorkflowOptions): ClassDecorator;
```
