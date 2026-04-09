# Building Tools

## Anatomy of a Tool

```ts
import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { MathService } from '../services/math.service';

// 1. Define the schema (single source of truth)
const MathSumSchema = z
  .object({
    a: z.number(),
    b: z.number(),
  })
  .strict();

// 2. Derive the type from the schema
type MathSumArgs = z.infer<typeof MathSumSchema>;

// 3. Declare the tool
@Tool({
  uiConfig: {
    description: 'Calculates the sum of two numbers.',
  },
  schema: MathSumSchema,
})
export class MathSumTool extends BaseTool {
  @Inject()
  private mathService: MathService;

  // 4. Implement call() — always returns Promise<ToolResult>
  async call(args: MathSumArgs): Promise<ToolResult<number>> {
    const sum = this.mathService.sum(args.a, args.b);
    return { data: sum };
  }
}
```

## Rules

**Schema:** Define it as a `const` above the class. Use `z.infer<typeof Schema>` to derive the TypeScript type. Never duplicate the shape manually.

**`@Tool` decorator:** Put the schema and UI config in the decorator. The framework uses the schema for validation before `call()` runs — invalid args never reach your code. `uiConfig` accepts either an inline config object or a path to a `.ui.yaml` file.

**`BaseTool`:** Extend it with no generics. The concrete `call()` signature defines args and return types.

**`call()`:** This is both the method you implement and the method workflows use to invoke the tool. The framework transparently wraps it with validation, interceptors, and side effects.

`call()` must always return `Promise<ToolResult>`. This ensures workflows must `await` the result — preventing silent bugs from missing `await`.

- **With async operations:** use `async call(args)` naturally
- **Without async operations:** use `async call(args)` (simplest) or return `Promise.resolve(...)` explicitly

```ts
// Option A: async keyword (simplest, minor lint warning about no await)
async call(args: MyArgs): Promise<ToolResult<number>> {
  return { data: args.a + args.b };
}

// Option B: explicit Promise.resolve (no lint warning)
call(args: MyArgs): Promise<ToolResult<number>> {
  return Promise.resolve({ data: args.a + args.b });
}
```

**Return type:** Use `ToolResult<T>` where `T` is your data type:

```ts
type ToolResult<TData = any> = {
  type?: 'text' | 'image' | 'file'; // content type hint
  data?: TData; // the main result
  error?: string; // error message (tool failed)
  metadata?: Record<string, unknown>;
  pending?: { workflowId: string }; // signals an async sub-workflow was launched
};
```

Most tools only set `data`. Use `error` for recoverable failures. Use `pending` when the tool launches a sub-workflow and the result arrives later via callback.

**`ToolCallOptions`:** `call()` accepts an optional second argument for async workflow callbacks:

```ts
async call(args: MyArgs, options?: ToolCallOptions): Promise<ToolResult> {
  // options.callback?.transition — the transition to fire when the sub-workflow completes
  // options.callback?.metadata   — extra data forwarded to the callback
}
```

## Available on `this`

| Property          | Type                 | Description                                    |
| ----------------- | -------------------- | ---------------------------------------------- |
| `this.repository` | `DocumentRepository` | Create, save, and query documents              |
| `this.ctx`        | `FrameworkContext`   | Execution context (see below)                  |
| `this.render`     | `TemplateRenderFn`   | Renders a Handlebars template file to a string |

### `this.ctx`

| Property           | Type                        | Description                                               |
| ------------------ | --------------------------- | --------------------------------------------------------- |
| `this.ctx.context` | `RunContext`                | Current run context (see below)                           |
| `this.ctx.runtime` | `WorkflowMetadataInterface` | Workflow metadata (documents, place, status, transitions) |
| `this.ctx.args`    | `Record<string, unknown>`   | Validated workflow-level args (from `@Input` schema)      |
| `this.ctx.parent`  | `WorkflowInterface`         | Parent workflow instance — for dynamic lookups            |

### `this.ctx.context` (RunContext)

| Property                            | Description                                     |
| ----------------------------------- | ----------------------------------------------- |
| `this.ctx.context.userId`           | Current user ID                                 |
| `this.ctx.context.workspaceId`      | Current workspace ID                            |
| `this.ctx.context.workflowId`       | Current workflow ID                             |
| `this.ctx.context.parentWorkflowId` | Parent workflow ID (if running as sub-workflow) |
| `this.ctx.context.labels`           | Labels attached to this run                     |
| `this.ctx.context.payload`          | Run payload data                                |
| `this.ctx.context.workflowContext`  | Arbitrary key-value context for the workflow    |

Most tools only need `this.ctx.context.userId` (for per-user auth tokens). Simple tools don't need `this.ctx` at all.

### `this.ctx.runtime` (WorkflowMetadataInterface)

| Property                       | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| `runtime.documents`            | Array of `DocumentEntity` in this workflow     |
| `runtime.place`                | Current place (node) in the workflow graph     |
| `runtime.status`               | Workflow state (`running`, `waiting`, etc.)    |
| `runtime.transition`           | The transition that triggered the current step |
| `runtime.availableTransitions` | Transitions available from the current place   |
| `runtime.tools`                | Tool instances registered in this workflow     |
| `runtime.hasError`             | Whether the workflow is in an error state      |
| `runtime.errorMessage`         | Error message (if `hasError` is true)          |
| `runtime.stop`                 | Whether the workflow has been stopped          |
| `runtime.result`               | Final workflow result (set on completion)      |

### `this.repository` (DocumentRepository)

```ts
// Create a document instance without persisting
const doc = this.repository.create(MessageDocument, { role: 'user', content: 'hello' });

// Validate and persist a document
const entity = await this.repository.save(MessageDocument, { role: 'user', content: 'hello' });

// Save with options
await this.repository.save(MessageDocument, data, {
  id: 'custom-id', // optional fixed ID
  meta: { source: 'tool' }, // optional metadata
  validate: 'strict', // 'strict' | 'safe' | 'skip'
});

// Save an already-created instance
await this.repository.save(doc);

// Find all documents of a type
const messages = this.repository.findAll(MessageDocument);

// Find documents by tag
const tagged = this.repository.findByTag('important');
```

## Injecting Services

Use standard NestJS `@Inject()` for services:

```ts
export class MyTool extends BaseTool {
  @Inject()
  private myService: MyService;
}
```

Use `@InjectTool()` for other Loopstack tools:

```ts
export class MyTool extends BaseTool {
  @InjectTool()
  private otherTool: OtherTool;

  async call(args: MyArgs): Promise<ToolResult> {
    const result = await this.otherTool.call({ ... });
    return { data: result.data };
  }
}
```

## Tool State

Tools can have stateful properties that persist across multiple `call()` invocations within the same workflow execution:

```ts
export class CounterTool extends BaseTool {
  count: number = 0;

  async call(_args?: object): Promise<ToolResult<number>> {
    this.count++;
    return { data: this.count };
  }
}
```

State properties are:

- **Isolated per workflow instance** — parallel executions don't share state
- **Checkpointed** — state survives wait/resume cycles
- **Reset between workflow runs** — each new workflow run starts fresh

Properties injected via `@Inject()` or `@InjectTool()` are pass-through (not managed as state).

## Module Registration

Export your tool from a NestJS module so workflows can use it:

```ts
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { MathSumTool } from './math-sum.tool';

@Module({
  imports: [LoopCoreModule],
  providers: [MathSumTool],
  exports: [MathSumTool],
})
export class MathToolModule {}
```

Import `LoopCoreModule` if your tool uses framework services (`this.repository`, `this.ctx`, `this.render`).

## Checklist

- [ ] Schema defined as a `const` with Zod
- [ ] Type derived with `z.infer<typeof Schema>`
- [ ] Schema passed to `@Tool({ schema })`
- [ ] UI config passed to `@Tool({ uiConfig: { description: '...' } })`
- [ ] Class extends `BaseTool` (no generics)
- [ ] `call()` returns `Promise<ToolResult<T>>`
- [ ] All tool calls are `await`ed in workflows
- [ ] Tool exported from a NestJS module
