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

**`@Tool` decorator:** Put the schema and UI config in the decorator. The framework uses the schema for validation before `call()` runs — invalid args never reach your code. `uiConfig` accepts either an inline config object or a path to a YAML file.

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

**Return type:** Use `ToolResult<T>` where `T` is your data type. The `data` property carries the result.

## Available on `this`

| Property          | Type                 | Description                       |
| ----------------- | -------------------- | --------------------------------- |
| `this.repository` | `DocumentRepository` | Create, save, and query documents |
| `this.ctx`        | `FrameworkContext`   | Execution context (see below)     |

### `this.ctx`

| Property                       | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `this.ctx.context.userId`      | Current user ID                                  |
| `this.ctx.context.workspaceId` | Current workspace ID                             |
| `this.ctx.context.workflowId`  | Current workflow ID                              |
| `this.ctx.runtime`             | Workflow metadata (documents, state, transition) |
| `this.ctx.args`                | Workflow-level args                              |
| `this.ctx.parent`              | Parent workflow instance                         |

Most tools only need `this.ctx.context.userId` (for per-user auth tokens). Simple tools don't need `this.ctx` at all.

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

## Checklist

- [ ] Schema defined as a `const` with Zod
- [ ] Type derived with `z.infer<typeof Schema>`
- [ ] Schema passed to `@Tool({ schema })`
- [ ] UI config passed to `@Tool({ uiConfig: { description: '...' } })`
- [ ] Class extends `BaseTool` (no generics)
- [ ] `call()` returns `Promise<ToolResult<T>>`
- [ ] All tool calls are `await`ed in workflows
