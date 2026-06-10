---
title: AI Tool Calling
description: Enabling LLMs to invoke workflow tools via function calling. Covers LlmDelegateToolCallsTool, tool descriptions, passing tools to LLM calls, and handling tool results.
---

# AI Tool Calling

Enable the LLM to call workflow tools (function calling). The LLM decides which tools to invoke, and `LlmDelegateToolCallsTool` executes them.

## Create a Tool for the LLM

Tools exposed to the LLM need a `description` so the LLM knows when to use them:

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

@Tool({
  name: 'get_weather',
  description: 'Retrieve weather information.',
  schema: z.object({
    location: z.string().describe('City or location name'),
  }),
})
export class GetWeather extends BaseTool<{ location: string }, object, string> {
  protected async handle(_args: { location: string }, _ctx: RunContext): Promise<ToolResult<string>> {
    return Promise.resolve({ type: 'text', data: 'Mostly sunny, 14C, rain in the afternoon.' });
  }
}
```

## Tool Calling Workflow

```typescript
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import { LlmDelegateToolCallsTool, LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { GetWeather } from './tools/get-weather.tool';

interface ToolCallState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
}

@Workflow({})
export class ToolCallWorkflow extends BaseWorkflow<Record<string, unknown>, ToolCallState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly getWeather: GetWeather,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: ToolCallState): Promise<ToolCallState> {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      content: 'How is the weather in Berlin?',
    });
    return state;
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: ToolCallState): Promise<ToolCallState> {
    const result = await this.llmGenerateText.call(
      {},
      { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
    );
    return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: ToolCallState): Promise<ToolCallState> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
    });
    return { ...state, delegateResult: result.data };
  }

  hasToolCalls(state: ToolCallState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async toolsComplete(state: ToolCallState): Promise<ToolCallState> {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      content: state.delegateResult!.toolResults.map((tr) => ({
        type: 'tool_result' as const,
        toolCallId: tr.toolCallId,
        content: tr.content ?? '',
        isError: tr.isError ?? false,
      })),
    });
    return state;
  }

  allToolsComplete(state: ToolCallState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: ToolCallState): Promise<unknown> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return {};
  }
}
```

## How the Loop Works

```
setup → llmTurn → [hasToolCalls?]
                     ├─ yes → executeToolCalls → toolsComplete → llmTurn (loop)
                     └─ no  → respond (done)
```

1. `llmGenerateText` is called — the `tools` array in config lists available tools
2. If the LLM returns `stopReason: 'tool_use'`, the guard routes to `executeToolCalls`
3. `llmDelegateToolCalls` executes the requested tools and stores results
4. The loop continues back to the LLM
5. When no more tool calls are needed, the fallback transition to `end` fires

## Key Concepts

- **`tools` array in config** — Lists tool names the LLM can call. Names must match `@Tool({ name })` values. At startup, Loopstack auto-discovers every `@Tool()`-decorated provider in the module graph and indexes them by name. If a name doesn't match, you'll get an error listing all registered tools — useful for catching typos and missing module imports.
- **`llmDelegateToolCalls`** — Executes tool calls from the LLM response message
- **`message.stopReason === 'tool_use'`** — The LLM wants to call a tool
- **`allCompleted`** — All delegated tool calls have finished
- **`@Guard` + `priority`** — Routes between tool calling and final response

## Under the Hood: How `llmDelegateToolCalls` Works

`LlmDelegateToolCallsTool` is what makes a tool-calling workflow actually do work. Without it, the LLM's `tool_call` blocks would just sit in the message — nothing would be executed. The tool reads the most recent assistant message, runs every tool the LLM requested, and stores the outputs back as `tool_result` entries that the next LLM turn can read.

Internally it delegates to `LlmDelegateService`, which:

1. **Resolves each tool by name** from the global tool registry (the same one built by `@Tool()` auto-discovery).
2. **Executes all tool calls in parallel** with `Promise.all` — the LLM is free to request multiple tools in one turn, and they run concurrently.
3. **Catches errors per tool** so one failing tool doesn't crash the others. Failures show up as `tool_result` entries with `isError: true` and are also collected on `result.errors` for inspection.
4. **Tracks pending async tools** — tools that return `{ pending: true }` (typically [HITL](./agent-workflows.md#human-in-the-loop) or sub-workflow tools) don't produce a result immediately. The result includes a `pendingCount`, and `allCompleted` stays `false` until those tools fire their completion callbacks. `LlmUpdateToolResultTool` is the companion that processes those callbacks and updates the delegate result.

This is why your tool-calling loop should always branch on `allCompleted` (continue when true, pause when false), not just on whether `tool_call` blocks exist — `allCompleted` is the signal that all parallel work, sync and async, is in.

## Registry References

- [tool-call-example-workflow](https://loopstack.ai/registry/loopstack-tool-call-example-workflow) — Complete tool calling loop with GetWeather tool, guard-based routing, and delegate pattern
