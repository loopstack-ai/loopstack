---
title: AI Text Generation
description: Calling LLMs for text generation using LlmGenerateTextTool. Covers setup, system prompts, message history, provider selection, prompt caching, and streaming.
---

# AI Text Generation

Generate text from any configured LLM provider using `LlmGenerateTextTool`. Pass prompts, system instructions, and message history — the tool handles provider routing, token counting, and optional streaming.

## Setup

```typescript
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';

@Module({
  imports: [ClaudeModule],
  providers: [PromptWorkflow],
  exports: [PromptWorkflow],
})
export class PromptModule {}
```

## Example Workflow

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import type { LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

interface PromptState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
}

@Workflow({
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow<{ subject: string }, PromptState> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'prompt_executed' })
  async prompt(state: PromptState, ctx: RunContext): Promise<PromptState> {
    const args = ctx.args as { subject: string };
    const result = await this.llmGenerateText.call(
      {
        prompt: this.render(__dirname + '/templates/prompt.md', { subject: args.subject }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );
    return { llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: PromptState): Promise<unknown> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return {};
  }
}
```

## Extracting Plain Text

`result.data!.message.content` can be either a string or an array of typed content blocks (`text`, `thinking`, `tool_call`). Use the `extractText()` helper to get a single concatenated text string regardless of shape:

```typescript
import { extractText } from '@loopstack/llm-provider-module';

const result = await this.llmGenerateText.call({ prompt: 'Write a haiku about coffee' });
const text = extractText(result.data!);
```

`extractText()` filters out `thinking` and `tool_call` blocks and joins remaining `text` blocks with newlines.

## Call Options

```typescript
await this.llmGenerateText.call(
  {
    // Option 1: Simple prompt
    prompt: 'Write a haiku about coffee',
    // Option 2: Explicit messages
    messages: [{ role: 'user', content: 'Write a haiku about coffee' }],
  },
  {
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      system: 'You are a helpful assistant.',
      // Option 3: Collect documents by tag as conversation history
      messagesSearchTag: 'message',
    },
  },
);
```

## Using Templates

Render Handlebars templates for complex prompts (`this.render()` is available from `BaseWorkflow`):

```typescript
const rendered = this.render(__dirname + '/templates/prompt.md', {
  subject: args.subject,
});

const result = await this.llmGenerateText.call(
  { prompt: rendered },
  { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
);
```

## Streaming

LLM responses stream to Studio automatically — no opt-in, no code changes. Whenever a workflow runs in a context that has a connected Studio client (`ctx.workflowId`, `ctx.userId`, and an active `ClientMessageService`), `LlmGenerateTextTool` assigns a `streamMessageId`, passes an `onStream` callback to the provider, and forwards each event to Studio as it arrives. The workflow itself still receives the complete `LlmGenerateTextResult` after the stream finishes — streaming is a side-effect for the UI, not a change to the return value.

### Lifecycle in Studio

1. Tool dispatches `llm.response.start` with a fresh `streamMessageId`.
2. Provider emits `text_delta`, `thinking_delta`, and `tool_call` events as content arrives. Studio renders an in-flight message keyed by `streamMessageId`.
3. Tool dispatches `llm.response.done` with the final normalized message; the result is returned to the workflow.
4. The workflow persists the response via `documentStore.save(LlmMessageDocument, result.data.message, ...)`. The saved document inherits `streamMessageId` as its `id`, so Studio **replaces** the in-flight streamed message with the final document — same ID, same slot. No duplicate bubble.

This is why you don't need to do anything special to "finalize" the stream: the document save naturally takes over from the stream because they share the same `id`.

### Custom providers

If you're implementing a custom `LlmProviderInterface`, honor the `onStream` callback in `LlmGenerateTextArgs` — call it with `LlmStreamEvent`s (`start`, `text_delta`, `thinking_delta`, `tool_call`, `done`, `error`) as content arrives. Providers that don't stream can ignore it; the framework still returns the final result correctly. See [Creating LLM Providers](../../extend/llm-providers.md) for the full event union.

## Environment Variables

| Variable            | Description       |
| ------------------- | ----------------- |
| `ANTHROPIC_API_KEY` | Anthropic API key |

## Registry References

- [prompt-example-workflow](https://loopstack.ai/registry/loopstack-prompt-example-workflow) — Single-turn prompt with subject parameter and Handlebars template
