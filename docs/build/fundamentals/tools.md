---
title: Creating Tools
description: How to define custom tools with BaseTool, Zod argument schemas, @Tool() decorator, handle() method signature, tool configuration, and dependency injection into workflows.
---

# Creating Tools

Tools are reusable TypeScript classes that encapsulate a single action — calling an API, querying a database, transforming data, or any other side effect. Define a tool once with a Zod schema for its arguments, then inject it into any workflow or expose it to LLMs for autonomous tool calling.

## Basic Tool

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';

@Tool({
  name: 'search',
  description: 'Short description of what this tool does.',
  schema: z
    .object({
      query: z.string().describe('Search query'),
      limit: z.number().default(10).describe('Max results'),
    })
    .strict(),
})
export class SearchTool extends BaseTool<{ query: string; limit: number }, object, string> {
  protected async handle(args: { query: string; limit: number }, ctx: LoopstackContext): Promise<ToolResult<string>> {
    return { data: `Found results for: ${args.query}` };
  }
}
```

## The `@Tool` Decorator

```typescript
@Tool({
  name: 'my_tool',                    // Snake_case name used as identifier
  description: 'User-facing description.',  // Also seen by LLMs for function calling
  schema: InputSchema,                // Zod schema for input validation
  configSchema: ConfigSchema,         // Optional: Zod schema for tool config
})
```

- **`name`** — Unique identifier for the tool (used in LLM wire format)
- **`description`** — Human-readable description (shown to LLMs for tool-use)
- **`schema`** — Zod schema that validates arguments before `handle()` is invoked
- **`configSchema`** — Optional Zod schema for config (provided via `options.config`)

## The `handle()` Method

The abstract method you implement. It receives validated arguments, the execution context, and optional config:

```typescript
protected async handle(
  args: TArgs,
  ctx: LoopstackContext,
  options?: ToolCallOptions<TConfig>,
): Promise<ToolResult<TData>> {
  // Your logic here
  return { data: result };
}
```

The public `call()` method is the entry point — it routes through validation before calling `handle()`.

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
return { data: 42 };                                    // Simple value
return { data: { name: 'result', items: [...] } };      // Typed data
return { error: 'Something went wrong' };                // Error
return { type: 'text', data: 'Mostly sunny, 14C.' };    // Typed output
return { data: result, metadata: { tokensUsed: 150 } };  // With metadata
```

## Dependency Injection

Use standard NestJS `@Inject()` or constructor injection:

```typescript
import { Inject } from '@nestjs/common';

@Tool({
  name: 'math_sum',
  description: 'Calculates the sum of two numbers.',
  schema: z.object({ a: z.number(), b: z.number() }).strict(),
})
export class MathSumTool extends BaseTool<{ a: number; b: number }, object, number> {
  constructor(private readonly mathService: MathService) {
    super();
  }

  protected async handle(args: { a: number; b: number }, ctx: LoopstackContext): Promise<ToolResult<number>> {
    return { data: this.mathService.sum(args.a, args.b) };
  }
}
```

## Tools for LLM Function Calling

When a tool is exposed to the LLM, the `description` and `schema` tell the LLM what the tool does and what arguments it accepts:

```typescript
@Tool({
  name: 'get_weather',
  description: 'Retrieve weather information for a location.',
  schema: z.object({
    location: z.string().describe('City or location name'),
  }),
})
export class GetWeather extends BaseTool<{ location: string }, object, string> {
  protected async handle(args: { location: string }, ctx: LoopstackContext): Promise<ToolResult<string>> {
    return Promise.resolve({ type: 'text', data: 'Mostly sunny, 14C.' });
  }
}
```

In the workflow, list the tool name in the `tools` config:

```typescript
constructor(
  private readonly llmGenerateText: LlmGenerateTextTool,
  private readonly getWeather: GetWeather,
) { super(); }

const result = await this.llmGenerateText.call(
  {},
  { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
);
```

## Using Tools in Workflows

```typescript
constructor(private readonly myTool: SearchTool) {
  super();
}

@Transition({ from: 'ready', to: 'done' })
async process(state: MyState): Promise<MyState> {
  const result = await this.myTool.call({ query: 'hello', limit: 5 });
  return { ...state, searchResults: result.data };
}
```

## Module Registration

```typescript
@Module({
  providers: [SearchTool, MathService],
  exports: [SearchTool],
})
export class MyToolModule {}
```

Then import the module in the workflow's parent module.

## File Structure

```
src/
├── tools/
│   ├── search.tool.ts
│   ├── math-sum.tool.ts
│   └── index.ts            # Re-exports all tools
├── services/
│   └── math.service.ts
├── my-feature.module.ts
└── index.ts
```

## Registry References

- [custom-tool-example-module](https://loopstack.ai/registry/loopstack-custom-tool-example-module) — MathSumTool with injected service, stateful CounterTool, and workflow demonstrating tool usage
- [tool-call-example-workflow](https://loopstack.ai/registry/loopstack-tool-call-example-workflow) — GetWeather tool exposed to the LLM for function calling

---

> **Using an AI coding agent?** See [Skill: Create a Custom Tool](/docs/skills/create-custom-tool) for a dense checklist and syntax reference optimized for code generation.
