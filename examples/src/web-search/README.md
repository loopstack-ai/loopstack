---
title: Web Search Examples
description: Runnable Loopstack examples for Claude web search — the native server tool claude_native_web_search listed in an llm_generate_text call, and the claude_web_search_step tool called as a workflow step.
---

# Web Search Examples

> Web search examples for the [Loopstack](https://loopstack.ai) automation framework.

Claude can search the web in two ways, and each example shows one of them:

- **Native Search** — `claude_native_web_search` from `@loopstack/claude` is a server tool. List it in the `tools` of an LLM call (an agent or `llm_generate_text`), and Claude searches inside that call. Reach for it when the model decides what to search for while it answers.
- **Search Step** — `claude_web_search_step` from `@loopstack/claude-tools` is a regular tool. The workflow calls it with a query, and the tool makes its own Claude request with the native search and returns the hits. Reach for it when the workflow decides what to search for and needs the hits as data.

To give an agent web search, list `claude_native_web_search` in its `tools`. Listing `claude_web_search_step` works too, but every search then costs a second LLM call.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/claude @loopstack/claude-tools @loopstack/common @loopstack/llm-provider
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { WebSearchExamplesModule } from './web-search/web-search-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), WebSearchExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

Both workflows call `llm_generate_text` from `@loopstack/llm-provider`, directly or through `claude_web_search_step`. That module is `@Global` and must be configured once in your root module:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { WebSearchExamplesModule } from './web-search/web-search-examples.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }),
    WebSearchExamplesModule,
  ],
})
export class AppModule {}
```

`WebSearchExamplesModule` imports `ClaudeModule`, which registers the Claude provider and `claude_native_web_search`, and `ClaudeToolsModule`, which provides `claude_web_search_step`.

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...   # required for both examples
```

Web search must be enabled for your organization in the Anthropic Console.

## Examples

| Example                         | Studio title                         | Description                                                                 |
| ------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| [Native Search](#native-search) | `Web Search - Native Search Example` | Claude searches inside one `llm_generate_text` call; results come as blocks |
| [Search Step](#search-step)     | `Web Search - Search Step Example`   | The workflow calls the search as a step and renders the hits as links       |

---

## Native Search

`NativeSearchExampleWorkflow` asks Claude a question that needs current information, with `claude_native_web_search` listed in the call's `tools`.

### What it demonstrates

- A server tool is listed by name, and the workflow never calls it. `llm_generate_text` sends Claude the tool's native spec (`web_search`), and Claude runs the searches inside that same call.
- The reply carries each search as a `server_tool_use` block (its input holds the query) and its hits as a `server_tool_result` block. Studio shows them in the saved reply as tool calls with their results.
- The workflow reads the queries and the sources from these blocks, saves the sources as a list of links, and publishes `{ queries, sources, answer }`.

### Key code

```ts
const result = await this.llmGenerateText.call(
  { prompt: ctx.args.question },
  { config: { provider: 'claude', tools: ['claude_native_web_search'] } },
);

const blocks = result.data.message.blocks ?? [];
const sources = blocks
  .filter((b): b is ServerToolResultBlock => b.type === 'server_tool_result')
  .flatMap((b) => (Array.isArray(b.content) ? (b.content as Source[]) : []));
```

A search that fails returns an error object instead of a list of results, so the workflow skips it. The spec fakes only the Anthropic client, so `toServerToolConfig()` and the Claude provider run in the test.

### Files

- `workflows/native-search/native-search-example.workflow.ts`

## Search Step

`SearchStepExampleWorkflow` calls `claude_web_search_step` with a query and renders the hits.

### What it demonstrates

- The search is a step: the workflow injects `ClaudeWebSearchStepTool` and calls it like any other tool.
- The tool makes its own Claude request with `claude_native_web_search` and does not save that reply. It returns `{ query, results, sourcesReminder, durationSeconds }`, where `results` holds the model's text and one block of hits (`{ title, url }`) per search.
- The workflow collects the hits, saves them as a list of links, and publishes `{ query, hits }`.

### Key code

```ts
const result = await this.webSearch.call({ query: ctx.args.query });

const hits = result.data.results.flatMap((entry) => (typeof entry === 'string' ? [] : entry.content));
```

The spec replays the tool's result, so the workflow's call and its rendering run without a Claude request.

### Files

- `workflows/search-step/search-step-example.workflow.ts`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
