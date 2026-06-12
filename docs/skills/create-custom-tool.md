---
title: 'Skill: Create a Custom Tool'
description: Step-by-step instructions for AI agents to scaffold a new tool — BaseTool class, @Tool decorator, Zod argument schema, handle() method, and module registration.
---

# Skill: Create a Custom Tool

> **For AI coding agents:** This page is a dense reference checklist optimized for tools like Claude Code scaffolding Loopstack code. For the human-readable guide, see [Creating Tools](../build/fundamentals/tools.md).

## Tool Anatomy

A tool is a class that extends `BaseTool`, decorated with `@Tool()`. Tools are the atomic units of logic invoked by workflows via `await this.tool.call(args)`.

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const InputSchema = z
  .object({
    query: z.string().describe('Search query'),
    limit: z.number().default(10).describe('Max results'),
  })
  .strict();

type MyToolArgs = z.infer<typeof InputSchema>;

@Tool({
  name: 'my_tool',
  description: 'Short description of what this tool does.',
  schema: InputSchema,
})
export class MyTool extends BaseTool<MyToolArgs, object, string> {
  // BaseTool<TArgs, TConfig, TResult, TMeta?>
  protected async handle(args: MyToolArgs, ctx: RunContext): Promise<ToolResult<string>> {
    return { data: `Found results for: ${args.query}` };
  }
}
```

### `BaseTool` Generics

| Parameter | Types                                | Validated against         | Default                   |
| --------- | ------------------------------------ | ------------------------- | ------------------------- |
| `TArgs`   | input arguments to `handle()`        | `@Tool({ schema })`       | `object`                  |
| `TConfig` | per-call config via `options.config` | `@Tool({ configSchema })` | `object`                  |
| `TResult` | `data` field of `ToolResult`         | —                         | `unknown`                 |
| `TMeta`   | `metadata` field of `ToolResult`     | —                         | `Record<string, unknown>` |

Pass `object` for `TConfig` when the tool has no configuration. Most tools only thread `TArgs` and `TResult`; `TConfig` and `TMeta` are reserved for tools that opt into config validation or typed result metadata (e.g. `LlmGenerateTextTool` types token usage on `metadata`).

## Decorators

### `@Tool(options?)`

Class decorator. Marks the class as a tool.

```typescript
@Tool({
  name: 'my_tool',               // Snake_case name used as identifier (for LLM wire format)
  description: 'User-facing description.',  // Also seen by LLMs for function calling
  schema: InputSchema,            // Zod schema for input validation
  configSchema: ConfigSchema,     // Optional: Zod schema for tool config
})
```

- `name` — Unique identifier for the tool
- `description` — Human-readable description (shown to LLMs for tool-use)
- `schema` — Zod schema that validates tool arguments before `handle()` is invoked. Validation is **strict**: if args fail validation, `tool.call()` throws a `ZodError` and `handle()` is never invoked. Tools have no `safe`/`skip` modes (unlike documents).
- `configSchema` — Optional Zod schema for config (provided via `options.config`). Same strict throw-on-failure behavior.
- `widget` — less common; see the [`@Tool` reference table](../build/fundamentals/tools.md#the-tool-decorator)

### Constructor Injection

Inject other tools or services via the constructor:

```typescript
constructor(private readonly otherTool: OtherTool) {
  super();
}
```

Tools are NestJS providers, so injecting another tool and calling `await this.otherTool.call(args)` is the standard pattern for composing tools. Each call goes through the full pipeline (args validation, config validation, interceptors).

## The `handle()` Method

```typescript
protected async handle(
  args: TArgs,
  ctx: RunContext,
  options?: ToolCallOptions<TConfig>,
): Promise<ToolResult<TData>>;
```

The `handle()` method receives validated arguments, the execution context, and optional config. This is the abstract method you implement.

The public `call()` method is the entry point — it routes through validation before calling `handle()`.

- `args` — Validated input (against the `@Tool({ schema })` Zod schema)
- `ctx` — Read-only [`RunContext`](../build/fundamentals/workflows.md#basewworkflow): `userId`, `workspaceId`, `workflowId`, `args`. `ctx.execution` is **undefined** in tools (it's only populated when `ctx` is passed to a workflow transition).
- `options` — Options including validated config and optional callback

### Args vs Config

Tools have two independent validation surfaces:

| Concept    | Decorator option          | Passed in via                | Typical source                           |
| ---------- | ------------------------- | ---------------------------- | ---------------------------------------- |
| **args**   | `@Tool({ schema })`       | first arg of `tool.call()`   | LLM (when tool-calling) or workflow code |
| **config** | `@Tool({ configSchema })` | `options.config` of `call()` | the workflow author at the call site     |

Use `args` for the **per-call input** (what the tool acts on) and `config` for **behaviour knobs** (which provider, which model, retry budget, etc.). Config is optional; most tools only need `schema`.

```typescript
@Tool({
  name: 'summarize',
  description: 'Summarize text using an LLM.',
  schema: z.object({ text: z.string() }), // args — the input
  configSchema: z.object({ model: z.string() }), // config — behaviour
})
export class Summarize extends BaseTool<{ text: string }, { model: string }, string> {
  protected async handle(args, ctx, options): Promise<ToolResult<string>> {
    const model = options?.config?.model ?? 'claude-sonnet-4-6';
    // ...use `model` to drive the LLM call, `args.text` as the prompt
    return { data: '...' };
  }
}

// Call site:
await this.summarize.call({ text: 'long article...' }, { config: { model: 'claude-opus-4-7' } });
```

### Async Tools: `complete()`

`BaseTool` also has an optional `complete(result)` method, called when a tool launches a sub-workflow from `handle()` and finishes asynchronously. Override it to post-process the sub-workflow result before it's returned to the LLM. The default passes the result through. See [Async Tools](../build/fundamentals/tools.md#async-tools-sub-workflow-callbacks) for the full lifecycle.

## ToolResult

```typescript
type ToolResult<TData = any> = {
  type?: 'text' | 'image' | 'file';
  data?: TData;
  error?: string;
  metadata?: Record<string, unknown>;
};
```

Return patterns:

```typescript
// Simple value
return { data: 42 };

// Typed data
return { data: { name: 'result', items: [...] } };

// Error
return { error: 'Something went wrong' };

// Text type
return { type: 'text', data: 'Mostly sunny, 14C.' };

// With metadata (e.g. usage tracking)
return {
  data: result,
  metadata: { tokensUsed: 150 },
};
```

## Document Store

`this.documentStore` is auto-injected on `BaseTool` (and `BaseWorkflow`). Use it to save documents:

```typescript
protected async handle(args: MyArgs, ctx: RunContext): Promise<ToolResult> {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: 'Processing complete.',
  });
  return { data: 'done' };
}
```

## Module Registration

Every tool must be registered as a NestJS provider and exported from a module.

```typescript
import { Module } from '@nestjs/common';

@Module({
  imports: [
    // Import modules whose tools you inject
  ],
  providers: [
    MyTool, // the tool
    MyService, // services injected via constructor
  ],
  exports: [MyTool],
})
export class MyToolModule {}
```

Then import `MyToolModule` in the app module or feature module that contains the workflow using the tool.

> **Reminder:** The module that defines your launchable workflows must also have `@StudioApp({ title, workflows })` — see [Modules & Workspaces](../build/fundamentals/modules.md) for details.

## Example: Tool with Injected Service

```typescript
// services/math.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MathService {
  sum(a: number, b: number): number {
    return a + b;
  }
}

// tools/math-sum.tool.ts
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { MathService } from '../services/math.service';

const MathSumSchema = z
  .object({
    a: z.number(),
    b: z.number(),
  })
  .strict();

type MathSumArgs = z.infer<typeof MathSumSchema>;

@Tool({
  name: 'math_sum',
  description: 'Math tool calculating the sum of two arguments.',
  schema: MathSumSchema,
})
export class MathSumTool extends BaseTool<MathSumArgs, object, number> {
  constructor(private readonly mathService: MathService) {
    super();
  }

  protected async handle(args: MathSumArgs, ctx: RunContext): Promise<ToolResult<number>> {
    const sum = this.mathService.sum(args.a, args.b);
    return { data: sum };
  }
}
```

## Example: Tool for LLM Function Calling

Tools exposed to the LLM need a `description` so the LLM knows when to use them. The `schema` field names and `.describe()` calls on schema fields provide the LLM with parameter information.

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

@Tool({
  name: 'get_weather',
  description: 'Retrieve weather information for a location.',
  schema: z.object({
    location: z.string().describe('City or location name'),
  }),
})
export class GetWeather extends BaseTool<{ location: string }, object, string> {
  protected async handle(args: { location: string }, ctx: RunContext): Promise<ToolResult<string>> {
    return Promise.resolve({ type: 'text', data: 'Mostly sunny, 14C.' });
  }
}
```

In the workflow, list the tool name in the `tools` config when calling the LLM:

```typescript
constructor(
  private readonly llmGenerateText: LlmGenerateTextTool,
  private readonly getWeather: GetWeather,
) { super(); }

await this.llmGenerateText.call(
  {},
  { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
);
```

## Using a Tool in a Workflow

```typescript
@Workflow({
  widget: __dirname + '/my.ui.yaml',
})
export class MyWorkflow extends BaseWorkflow {
  constructor(private readonly myTool: MyTool) {
    super();
  }

  @Transition({ to: 'end' })
  async run(state: unknown): Promise<unknown> {
    const result = await this.myTool.call({ query: 'hello', limit: 5 });
    // result.data contains the tool's return value
    return state;
  }
}
```

## File Structure Convention

```
src/
├── tools/
│   ├── my-tool.tool.ts
│   ├── another.tool.ts
│   └── index.ts            # re-exports all tools
├── services/
│   └── my.service.ts
├── my-feature.module.ts
└── index.ts                 # re-exports module + tools
```

## Checklist

1. Create tool class extending `BaseTool<TArgs, TConfig, TResult>` with `@Tool({ name, description, schema })`
2. Implement `handle(args, ctx, options?)` returning `Promise<ToolResult>`
3. Register as provider in a NestJS `@Module()`
4. Export from the module
5. Import module in the workflow's parent module
6. Inject in workflow via constructor
7. Call via `await this.tool.call(args)` in transition methods
