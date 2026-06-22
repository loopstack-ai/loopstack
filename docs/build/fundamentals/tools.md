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
import type { RunContext } from '@loopstack/common';

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
  protected async handle(args: { query: string; limit: number }, ctx: RunContext): Promise<ToolResult<string>> {
    return { data: `Found results for: ${args.query}` };
  }
}
```

## The `@Tool` Decorator

```typescript
@Tool({
  name: 'my_tool',
  description: 'User-facing description.',
  schema: InputSchema,
})
```

All options are optional.

| Option         | Type                       | Default            | Description                                                                                                                                                            |
| -------------- | -------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | `string`                   | class name (as-is) | Unique identifier used in the LLM tool-calling wire format. Always set this to a snake_case identifier (e.g. `git_status`, `math_sum`) — the class name is a fallback. |
| `description`  | `string`                   | —                  | Human-readable description shown to LLMs for tool-use. Critical for autonomous tool calling.                                                                           |
| `widget`       | `WidgetRef \| WidgetRef[]` | —                  | Custom Studio widget(s) for rendering tool calls/results — YAML file path(s) or inline widget object(s).                                                               |
| `schema`       | `z.ZodType`                | —                  | Zod schema validating tool arguments before `handle()` is invoked.                                                                                                     |
| `configSchema` | `z.ZodType`                | —                  | Zod schema validating tool config (provided via `options.config` on `call()`).                                                                                         |

## The `handle()` Method

The abstract method you implement. It receives validated arguments, the execution context, and optional config:

```typescript
protected async handle(
  args: TArgs,
  ctx: RunContext,
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

  protected async handle(args: { a: number; b: number }, ctx: RunContext): Promise<ToolResult<number>> {
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
  protected async handle(args: { location: string }, ctx: RunContext): Promise<ToolResult<string>> {
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

## Async Tools (sub-workflow callbacks)

A tool can launch a sub-workflow from `handle()` and finish asynchronously when that sub-workflow completes. The lifecycle has two halves:

1. **`handle()`** returns `{ data, pending: { workflowId } }`. The `pending` field tells the framework "I started run `workflowId`, don't return to the LLM yet — wait for that run to finish, then call me back."
2. **`complete(result)`** runs when the sub-workflow finishes. The argument is the sub-workflow's output. The return value is the `ToolResult` that's actually delivered to the LLM (or the caller).

The default `complete()` on `BaseTool` passes the sub-workflow's data straight through:

```typescript
async complete(result: Record<string, unknown>): Promise<ToolResult> {
  return { data: (result as { data?: unknown }).data ?? result };
}
```

Override it when you need to post-process: transform the payload, validate, or short-circuit. The HITL pattern uses this — `AskForApprovalTool.handle()` launches the sub-workflow with `show: 'inline'` so its UI appears in the parent's run view, and returns `pending`; `complete()` returns the user's decision as the typed answer.

```typescript
@Tool({ name: 'ask_for_approval', description: 'Ask the user to approve.', /* … */ })
export class AskForApprovalTool extends BaseTool</* … */> {
  protected async handle(/* … */) {
    const { workflowId } = await this.confirmWorkflow.run(
      args,
      { callback: { transition: 'onConfirm' }, show: 'inline', label: 'Waiting for approval...' },
    );
    return { data: { workflowId }, pending: { workflowId } };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult<AskForApprovalResult>> {
    const { workflowId, data } = result as { workflowId: string; data: { confirmed: boolean } };
    return { data: { approved: data.confirmed, workflowId } };
  }
}
```

Use this when a tool genuinely depends on an async outcome (HITL, long-running provisioning, external job completion). For tools that finish synchronously inside `handle()`, you don't need `complete()` at all.

## Server Tools

Some LLM providers ship built-in tools that **run on the provider's side**, not in your app — examples are Anthropic's `web_search` and `code_execution`. Loopstack exposes these via the `ServerTool` base class instead of `BaseTool`.

Key differences from `BaseTool`:

| Aspect          | `BaseTool`                                   | `ServerTool`                              |
| --------------- | -------------------------------------------- | ----------------------------------------- |
| Execution       | runs locally in your app                     | runs on the LLM provider's infrastructure |
| Abstract method | `handle(args, ctx, options)`                 | `toServerToolConfig(config?)`             |
| Has `call()`    | yes — entry point for workflow code          | no — the provider invokes it              |
| Use it for      | your own logic, API calls, internal services | provider-native built-in tools            |

A server tool's job is to translate the workflow author's config into the provider-native shape. The framework detects `instanceof ServerTool` when assembling the LLM request and sends the result of `toServerToolConfig()` to the provider instead of registering a callable local tool.

```typescript
import { z } from 'zod';
import { ServerTool, Tool } from '@loopstack/common';

const ConfigSchema = z.object({
  maxUses: z.number().int().positive().default(8),
  allowedDomains: z.array(z.string()).optional(),
});
type Config = z.infer<typeof ConfigSchema>;

@Tool({
  name: 'claude_web_search_server',
  description: "Search the web using Claude's built-in server-side web search.",
  configSchema: ConfigSchema,
})
export class ClaudeWebSearchServerTool extends ServerTool<Config> {
  toServerToolConfig(config?: Config): unknown {
    return {
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: config?.maxUses ?? 8,
      ...(config?.allowedDomains?.length ? { allowed_domains: config.allowedDomains } : {}),
    };
  }
}
```

List the server tool in the LLM `tools` config the same way as a regular tool — the framework picks the right code path based on the class.

```typescript
await this.llmGenerateText.call(
  {},
  {
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      tools: ['claude_web_search_server'],
    },
  },
);
```

## Using Tools in Workflows

```typescript
constructor(private readonly myTool: SearchTool) {
  super();
}

@Transition({ from: 'ready', to: 'done' })
async process(state: MyState) {
  const result = await this.myTool.call({ query: 'hello', limit: 5 });
  this.assignState({ searchResults: result.data });
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

> **Using an AI coding agent?** See [Skill: Create a Custom Tool](../../skills/create-custom-tool.md) for a dense checklist and syntax reference optimized for code generation.
