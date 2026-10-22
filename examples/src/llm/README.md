---
title: LLM Examples
description: Workflow examples for LLM integration in Loopstack — simple prompts, structured output with Zod schemas, multi-provider comparison, a custom LLM provider (EchoLlmProvider registered with LlmProviderRegistry), web fetch with summarization
---

# LLM Examples

> LLM workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

A collection of workflow examples that demonstrate how to integrate LLMs into Loopstack workflows. Use these as starting points for prompts, structured output, multi-provider setups, writing your own LLM provider, and fetching web content.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/claude @loopstack/common @loopstack/llm-provider @loopstack/openai @loopstack/web
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { LlmExamplesModule } from './llm/llm-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), LlmExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

Every workflow in this module calls a tool from `@loopstack/llm-provider` (`LlmGenerateTextTool`, `LlmGenerateObjectTool`). That module is `@Global` and must be configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { LlmExamplesModule } from './llm/llm-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }), LlmExamplesModule],
})
export class AppModule {}
```

`LlmExamplesModule` already re-imports `ClaudeModule`, `OpenAiModule`, `WebModule`, and its own `EchoModule` — the Claude, OpenAI and echo providers register themselves with the LLM registry so the examples can dispatch to any of them. `LlmProviderModule.forRoot(...)` sets the default model the tools fall back to when a call doesn't override `{ config: { provider, model } }` explicitly.

## Environment

Set provider API keys for the workflows you want to run:

```bash
ANTHROPIC_API_KEY=sk-ant-...   # required for Claude examples
OPENAI_API_KEY=sk-...          # required for the multi-provider example
```

The Custom Provider example needs no key.

## Examples

| Example                                 | Studio title                                           | Description                                                             |
| --------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| [Prompt](#prompt)                       | `LLM - Prompt Example (Write a haiku)`                 | Single-shot LLM call with a Handlebars-rendered prompt template         |
| [Structured Output](#structured-output) | `LLM - Structured Output Example (Hello World Script)` | Generate Zod-validated structured output with a custom document widget  |
| [Multi-Provider](#multi-provider)       | `LLM - Multi-Provider Example`                         | Run the same prompt through Claude and OpenAI side by side              |
| [Custom Provider](#custom-provider)     | `LLM - Custom Provider Example`                        | A minimal LLM provider, registered and called through `config.provider` |
| [Web Fetch](#web-fetch)                 | `LLM - Web Fetch Example`                              | Fetch a URL, convert HTML to Markdown, summarize with an LLM            |

---

## Prompt

Single-shot LLM call using a Handlebars-rendered prompt template. Generates a haiku about a user-provided subject.

### What it demonstrates

- Defining workflow input arguments with a Zod schema and default values
- Using the `prompt` parameter for a simple LLM call
- Rendering Handlebars templates with `this.render(path, vars)`
- Automatic assistant message persistence via `LlmGenerateTextTool`

### Key code

```ts
@Transition({ to: 'end' })
async prompt(state, ctx: RunContext<PromptExampleArgs>) {
  await this.llmGenerateText.call(
    { prompt: this.render(join(__dirname, 'templates', 'prompt.md'), { subject: ctx.args.subject }) },
    { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
  );
}
```

`LlmGenerateTextTool` saves the assistant message to the document store automatically — no manual `documentStore.save()` needed. Pass `config: { save: false }` to opt out.

### Files

- `prompt-example.workflow.ts` — workflow class
- `templates/prompt.md` — Handlebars prompt template

## Structured Output

Generates a Zod-validated object (a `FileDocument` with `filename`, `description`, `code`) using `LlmGenerateObjectTool`. Renders in Studio via a custom widget.

### What it demonstrates

- Defining a `@Document` class with a Zod schema and a YAML widget
- Calling `LlmGenerateObjectTool` with `outputSchema` for Zod-validated JSON output
- Persisting the structured result via `this.documentStore.save(FileDocument, result.data.data)`
- Multi-transition state flow: `start` → `ready` → `prompt_executed` → `end`

### Key code

```ts
const result = await this.llmGenerateObject.call(
  {
    outputSchema: FileDocumentSchema,
    prompt: this.render(join(__dirname, 'templates', 'prompt.md'), { language: state.language }),
  },
  { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
);

const llmResult = await this.documentStore.save(FileDocument, result.data.data as FileDocumentType);
this.assignState({ llmResult });
```

### Files

- `structured-output-example.workflow.ts` — workflow class
- `documents/file-document.ts` — `@Document` class + Zod schema
- `documents/file-document.yaml` — Studio widget definition
- `templates/prompt.md` — Handlebars prompt template

## Multi-Provider

Sends the same prompt to Claude and OpenAI and renders responses side by side for comparison.

### What it demonstrates

- Using the same tool class (`LlmGenerateTextTool`) for multiple providers
- Selecting provider and model at call time via `{ config: { provider, model } }`
- Opting out of auto-save with `config: { save: false }`, so the workflow saves each reply itself with a provider label

### Key code

```ts
const result = await this.llmGenerateText.call(
  { prompt: ctx.args.prompt },
  {
    config: {
      save: false,
      provider: 'claude',
      model: 'claude-sonnet-4-6',
    },
  },
);

await this.documentStore.save(LlmMessageDocument, {
  role: 'assistant',
  text: `**Claude:** ${result.data.message.text}`,
});
```

The `save: false` opt-out lets us prefix each response with the provider name so the comparison is clear in the Studio chat view.

### Files

- `multi-provider-example.workflow.ts` — workflow class

## Custom Provider

`EchoLlmProvider` is a minimal LLM provider that answers with the last user message. It needs no API key or model server, so it shows the provider contract without the details of a real SDK. Start from it when you connect an LLM API that has no Loopstack module yet. [Creating LLM Providers](/docs/extend/llm-providers) explains each part of it.

### What it demonstrates

- Implementing `LlmProviderInterface`: `generateText`, `generateObject`, `extractUsage` and `toProviderMessage`
- Registering the provider with `LlmProviderRegistry` in `onModuleInit`, so importing `EchoModule` is all an app needs
- Calling it through `LlmGenerateTextTool` with `{ config: { provider: 'echo' } }`
- Reading the conversation from saved message documents: replaying `meta.response` only for messages this provider wrote, and converting all others with `toProviderMessage`
- Streaming the reply as `text_delta` events, and rejecting tools the provider cannot run

### Key code

```ts
@Injectable()
export class EchoLlmProvider implements LlmProviderInterface, OnModuleInit {
  readonly providerId = 'echo';

  constructor(
    private readonly registry: LlmProviderRegistry,
    private readonly client: EchoClient,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }
  // generateText, generateObject, extractUsage, toProviderMessage
}
```

```ts
await this.documentStore.save(LlmMessageDocument, { role: 'user', text: ctx.args.message });

// No prompt: the provider reads the conversation from the saved message documents
const result = await this.llmGenerateText.call({}, { config: { provider: 'echo', model: 'echo-1' } });
```

Run it with the default input and the workflow completes with `{ text: 'Echo: Hello, custom provider!' }`. The reply is saved as an assistant message with `meta.provider: 'echo'`.

### Files

- `custom-provider-example.workflow.ts` — workflow class
- `echo/echo-client.ts` — `EchoClient`, standing in for the SDK client of a real API
- `echo/echo-llm-provider.ts` — `EchoLlmProvider`, the provider
- `echo/echo.module.ts` — `EchoModule`, the module an app imports

## Web Fetch

Fetches a URL, converts HTML to Markdown, and optionally summarizes it against a user-provided prompt using a small model via the configured LLM provider.

### What it demonstrates

- Using `WebFetchTool` from `@loopstack/web`
- HTML → Markdown conversion with size caps and same-origin redirect handling
- Optional prompt-based summarization built into the tool

### Key code

```ts
const result = await this.webFetch.call({
  url: ctx.args.url,
  prompt: ctx.args.prompt,
});

this.assignState({ summary: result.data.result });
```

When `prompt` is omitted, `WebFetchTool` returns the raw Markdown (truncated if very long). When provided, the tool summarizes the content through the configured LLM provider (model `claude-haiku-4-5-20251001` by default) and returns the provider, model and token usage as result metadata.

### Files

- `web-fetch-example.workflow.ts` — workflow class

### Related modules

- `@loopstack/web` — fetch + Markdown conversion + summarization
- `@loopstack/claude` — `claude_native_web_search`, Claude's server-side web search tool (alternative when you want the LLM to search rather than fetch a specific URL)

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
