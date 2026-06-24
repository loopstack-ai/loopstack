---
title: LLM Examples
description: Workflow examples for LLM integration in Loopstack — simple prompts, structured output with Zod schemas, multi-provider comparison, web fetch with summarization
---

# @loopstack/llm-examples

> LLM workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

A collection of workflow examples that demonstrate how to integrate LLMs into Loopstack workflows. Use these as starting points for prompts, structured output, multi-provider setups, and fetching web content.

## Install as Source (Recommended)

Examples are meant to be read, copied, and adapted. Pull the source straight into your project with [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/llm-examples src/llm-examples
```

This copies the full `src/` tree into `src/llm-examples/` so you can read the workflow files, edit prompts, swap providers, and ship them as your own. Drop or keep individual workflows as you like.

After copying, register the module in your app:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { LlmExamplesModule } from './llm-examples/llm-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), LlmExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

If you just want to run the examples as-is without modifying source:

```bash
npm install @loopstack/llm-examples
```

```typescript
import { LlmExamplesModule } from '@loopstack/llm-examples';
```

## Environment

Set provider API keys for the workflows you want to run:

```bash
ANTHROPIC_API_KEY=sk-ant-...   # required for Claude examples
OPENAI_API_KEY=sk-...          # required for the multi-provider example
```

## Examples

| Example                                 | Studio title                                           | Description                                                            |
| --------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| [Prompt](#prompt)                       | `LLM - Prompt Example (Write a haiku)`                 | Single-shot LLM call with a Handlebars-rendered prompt template        |
| [Structured Output](#structured-output) | `LLM - Structured Output Example (Hello World Script)` | Generate Zod-validated structured output with a custom document widget |
| [Multi-Provider](#multi-provider)       | `LLM - Multi-Provider Example`                         | Run the same prompt through Claude and OpenAI side by side             |
| [Web Fetch](#web-fetch)                 | `LLM - Web Fetch Example`                              | Fetch a URL, convert HTML to Markdown, summarize with Claude           |

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
- Opting out of auto-save with `config: { save: false }` to control message formatting
- Custom start-form widget via `widget: './multi-provider.ui.yaml'`

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
- `multi-provider.ui.yaml` — Studio start-form widget

## Web Fetch

Fetches a URL, converts HTML to Markdown, and optionally summarizes it against a user-provided prompt using a small Claude model.

### What it demonstrates

- Using `WebFetchTool` from `@loopstack/web-module`
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

When `prompt` is omitted, `WebFetchTool` returns the raw Markdown (truncated if very long). When provided, the tool summarizes the content with a small Claude model.

### Files

- `web-fetch-example.workflow.ts` — workflow class

### Related modules

- `@loopstack/web-module` — fetch + Markdown conversion + summarization
- `@loopstack/claude-tools-module` — Claude server-side web search (alternative when you want the LLM to search rather than fetch a specific URL)

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
