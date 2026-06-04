# AI Text Generation

Use `LlmGenerateTextTool` from `@loopstack/llm-provider-module` to call an LLM for text generation.

## Setup

```typescript
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [PromptWorkflow],
  exports: [PromptWorkflow],
})
export class PromptModule {}
```

## Example Workflow

```typescript
import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, TEMPLATE_RENDERER, Transition, Workflow } from '@loopstack/common';
import type { LoopstackContext, TemplateRenderFn } from '@loopstack/common';
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
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'prompt_executed' })
  async prompt(state: PromptState, ctx: LoopstackContext): Promise<PromptState> {
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

Render Handlebars templates for complex prompts (inject via `@Inject(TEMPLATE_RENDERER)`):

```typescript
const rendered = this.render(__dirname + '/templates/prompt.md', {
  subject: args.subject,
});

const result = await this.llmGenerateText.call(
  { prompt: rendered },
  { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
);
```

## Environment Variables

| Variable            | Description       |
| ------------------- | ----------------- |
| `ANTHROPIC_API_KEY` | Anthropic API key |

## Registry References

- [prompt-example-workflow](https://loopstack.ai/registry/loopstack-prompt-example-workflow) — Single-turn prompt with subject parameter and Handlebars template
