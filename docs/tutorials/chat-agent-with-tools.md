---
title: 'Tutorial: Multi-Turn Chat Agent with Tool Calling'
description: Step-by-step tutorial building a weather assistant chatbot with custom tools, LLM tool calling, @Guard-based routing, multi-turn message history, and Loopstack Studio UI.
---

# Tutorial: Build a Multi-Turn Chat Agent with Tool Calling

In this tutorial you'll build a weather assistant chatbot. Users can ask about the weather in any city, and the LLM will call a tool to retrieve the data, then reply — all within an ongoing conversation that supports multiple messages.

When you're done you'll have a working workflow in Loopstack Studio that looks like this:

```
start → setup → [user sends message] → LLM turn → [if tool call: delegate → wait for tools → LLM again] → reply → [user sends message] → ...
```

**What you'll learn:**

- How to define a custom tool with `@Tool` and `BaseTool`
- How to give an LLM access to tools at call time
- How `@Guard` routes transitions conditionally based on workflow state
- How `LlmDelegateToolCallsTool` delegates tool execution with a callback for async tools
- How `LlmUpdateToolResultTool` merges each completed tool's result back into the loop
- How to build a multi-turn chat loop using `wait: true` + cycling transitions
- How the document store acts as the LLM's conversation history

**Prerequisites:** Complete the [Getting Started](../build/getting-started.md) guide first. You should have a running NestJS app with `LoopstackModule.forRoot()` configured and Studio accessible at `http://localhost:5173`.

**Time:** ~30 minutes

---

## 1. Install Dependencies

This workflow uses Claude for LLM calls:

```shell
npm install @loopstack/claude-module @loopstack/llm-provider-module
```

---

## 2. Create the Module

Create the folder and module file first. You'll add providers to it as you build each piece.

Create `src/weather-chat/weather-chat.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { StudioApp } from '@loopstack/common';
import { GetWeatherTool } from './tools/get-weather.tool';
import { WeatherChatWorkflow } from './weather-chat.workflow';

@StudioApp({
  title: 'Weather Chat',
  workflows: [WeatherChatWorkflow],
})
@Module({
  imports: [ClaudeModule],
  providers: [WeatherChatWorkflow, GetWeatherTool],
  exports: [WeatherChatWorkflow],
})
export class WeatherChatModule {}
```

Register it in `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { WeatherChatModule } from './weather-chat/weather-chat.module';

@Module({
  imports: [LoopstackModule.forRoot(), WeatherChatModule],
})
export class AppModule {}
```

---

## 3. Create the Tool

A tool is a TypeScript class with a `@Tool` decorator describing it to the LLM, and a `handle()` method containing the actual logic.

Create `src/weather-chat/tools/get-weather.tool.ts`:

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const GetWeatherSchema = z.object({
  location: z.string().describe('City name or region to get weather for'),
});

type GetWeatherArgs = z.infer<typeof GetWeatherSchema>;

@Tool({
  name: 'get_weather',
  description: 'Retrieve current weather conditions for a given location.',
  schema: GetWeatherSchema,
})
export class GetWeatherTool extends BaseTool<GetWeatherArgs> {
  protected async handle(args: GetWeatherArgs): Promise<ToolEnvelope<string>> {
    // In a real implementation, call a weather API here
    return {
      type: 'text',
      data: `Weather in ${args.location}: Partly cloudy, 18°C, humidity 65%.`,
    };
  }
}
```

**What the LLM sees:** The `name`, `description`, and `schema` from `@Tool` are passed to the LLM at call time. The LLM reads the schema's field descriptions (`describe(...)`) to understand what arguments to provide. Your `handle()` method is never seen by the LLM — it's called internally when the LLM requests the tool.

---

## 4. Create the System Prompt

Create `src/weather-chat/templates/system.md`:

```markdown
You are a helpful weather assistant.
When the user asks about weather, use the get_weather tool to retrieve current conditions.
Keep your responses concise and conversational.
```

This system message primes the LLM before the first user turn. It tells the model what role it's playing and when to use tools.

---

## 5. Create the Chat UI Config

The workflow needs a `prompt-input` widget — the text box that appears at the bottom of the Studio UI when the workflow is waiting for user input.

Create `src/weather-chat/weather-chat.ui.yaml`:

```yaml
widget: prompt-input
enabledWhen:
  - waiting_for_user
options:
  transition: userMessage
  label: Send Message
```

**How `enabledWhen` works:** The widget is only active when the workflow is in the `waiting_for_user` place. While the LLM is processing, the input is disabled — the user can't send another message until the workflow cycles back to `waiting_for_user`.

---

## 6. Write the Workflow

This is the core of the tutorial. The workflow manages four places and five transitions that form two interlocking loops: the chat loop (user → LLM → user) and the tool loop (LLM → tools → LLM).

Create `src/weather-chat/weather-chat.workflow.ts`:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Guard, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import {
  LlmContextDocument,
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';

interface ChatState {
  llmResult?: LlmGenerateTextResult;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  title: 'Weather Chat Assistant',
  description: 'A multi-turn chat agent that can look up weather using tool calling.',
  widget: './weather-chat.ui.yaml',
})
export class WeatherChatWorkflow extends BaseWorkflow {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
  ) {
    super();
  }

  // Step 1: Save the system prompt as internal context, then wait for first user message
  @Transition({ to: 'waiting_for_user' })
  async setup(state: ChatState) {
    await this.documentStore.save(LlmContextDocument, {
      role: 'user',
      text: this.render(join(__dirname, 'templates', 'system.md')),
    });
  }

  // Step 2: User sends a message — save it and move to LLM generation
  @Transition({ from: 'waiting_for_user', to: 'generating', wait: true, schema: z.string() })
  async userMessage(state: ChatState, input: TransitionInput<string>) {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: input.data });
  }

  // Step 3: Call the LLM with tool access — store the result for routing
  @Transition({ from: 'generating', to: 'response_received' })
  async llmTurn(state: ChatState) {
    const result = await this.llmGenerateText.call(
      {},
      { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
    );
    this.assignState({ llmResult: result.data });
  }

  // Step 4a: LLM requested tools — delegate execution. The callback fires per pending tool.
  @Transition({ from: 'response_received', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeTools(state: ChatState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.assignState({ delegateResult: result.data });
  }

  hasToolCalls(state: ChatState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  // Step 4b: A pending tool finished — merge its result into delegateResult.
  // Sync tools never enter this transition; async tools (sub-workflows, HITL) re-enter once per completion.
  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived(state: ChatState, payload: unknown) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: payload,
    });
    this.assignState({ delegateResult: result.data });
  }

  // Step 4c: All tool results in — loop back to LLM for the next turn.
  @Transition({ from: 'awaiting_tools', to: 'generating' })
  @Guard('allToolsComplete')
  toolsComplete(_state: ChatState) {}

  allToolsComplete(state: ChatState): boolean {
    return !!state.delegateResult?.allCompleted;
  }

  // Step 4d: LLM produced a final text response — auto-saved by llmGenerateText
  @Transition({ from: 'response_received', to: 'waiting_for_user' })
  saveResponse(state: ChatState) {}
}
```

---

## 7. Add Your API Key and Run

Add your Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Start (or restart) the dev server:

```shell
npm run start:dev
```

---

## 8. Try It in Studio

Open Studio at `http://localhost:5173`.

1. Click **New Run** and select the **Weather Chat** app
2. Select the **Weather Chat Assistant** workflow
3. Click **Run Now** — no input required
4. The workflow sets up the system prompt and the chat input appears at the bottom
5. Type `What's the weather in Tokyo?` and press Enter
6. The workflow calls the LLM, which calls `get_weather`, receives the result, and replies
7. Continue the conversation — ask about another city, or ask a follow-up question

---

## What Just Happened

There are two loops running in this workflow:

**The chat loop** — the outer loop that keeps the conversation going:

```
waiting_for_user → [user sends message] → userMessage → generating → llmTurn → response_received → saveResponse → waiting_for_user
```

**The tool loop** — the inner loop that runs when the LLM calls tools:

```
response_received → executeTools → awaiting_tools → toolsComplete → generating → llmTurn → response_received
                                            ↑__ toolResultReceived (async tools only) __|
```

The tool loop continues as long as the LLM keeps requesting tools. Once it produces a final text response, `hasToolCalls` returns `false`, `executeTools` is skipped, and `saveResponse` runs instead — sending the workflow back to `waiting_for_user` for the next message.

**Why no prompt in `llmTurn`:** The LLM call passes `{}` as the prompt. Loopstack automatically includes all `LlmMessageDocument` records saved in the current run as the conversation history. The document store IS the LLM's memory. Each new user message and each tool result you save becomes part of the context for the next LLM turn.

**Why `LlmContextDocument` for the system prompt:** The system message needs to be part of the LLM's context but shouldn't appear in the chat UI. `LlmContextDocument` is declared `@Document({ internal: true, tags: ['message'] })` — the framework excludes internal rows from API responses (so Studio never sees them) while keeping the `'message'` tag so the LLM provider still picks them up as conversation history.

**How `@Guard` works:** When the workflow reaches `response_received`, it evaluates all outgoing transitions. `executeTools` has `priority: 10` and a guard — Loopstack calls `hasToolCalls(state)` first. If it returns `true`, `executeTools` runs. If it returns `false`, Loopstack moves to the next-priority transition: `saveResponse`.

**How `LlmDelegateToolCalls` works:** The LLM's response contains tool call requests (tool name + arguments). `LlmDelegateToolCallsTool` looks up each matching registered tool class (e.g. `GetWeatherTool`) and dispatches them in parallel. Synchronous tools return immediately and populate `result.toolResults`. Asynchronous tools (sub-workflow tools, HITL tools) return `pending: true` and emit a callback when they finish — the workflow's `toolResultReceived` (`wait: true` self-loop) catches each callback and calls `LlmUpdateToolResultTool` to merge the result. When `allCompleted` flips true, the unguarded `toolsComplete` transition fires and the loop returns to the LLM.

For weather (a single sync tool), `toolResultReceived` is never entered — `allCompleted` is already true the moment `executeTools` returns. The wait-loop is in place so the same workflow shape scales the day you swap in or add a sub-workflow tool. Without it, the workflow would silently hang on the first async tool.

**Shortcut:** if you don't need to own the FSM, `@loopstack/agent` ships `ChatAgentWorkflow` which encapsulates this exact loop. Call `chatAgent.run({ system, tools, userMessage })` from a parent workflow and skip writing the inner machinery.

---

## Next Steps

- **[Custom Tools](../build/fundamentals/tools.md)** — build tools that call real external APIs, inject NestJS services, or validate their own output
- **[Dynamic Routing](../build/patterns/dynamic-routing.md)** — extend the guard pattern to handle error states, retries, or multi-step branching
- **[Sub-Workflows](../build/patterns/sub-workflows.md)** — replace the inline tool loop with a dedicated agent sub-workflow
- **[Registry example](https://loopstack.ai/registry/loopstack-agent-example-workflow)** — The complete source for the agent pattern using `AgentWorkflow`
