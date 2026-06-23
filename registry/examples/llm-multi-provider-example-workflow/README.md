---
title: LLM Multi-Provider Example
description: Example using multiple LLM providers (Claude and OpenAI) in the same workflow — side-by-side responses, call-time config with different provider settings
---

# LLM Multi-Provider Example

Demonstrates how to use multiple LLM providers (Claude and OpenAI) in the same workflow. The same prompt is sent to both providers and the responses are displayed side by side.

## Key Concepts

### One tool, multiple providers via call-time config

The same tool class (`LlmGenerateTextTool`) is injected once via the constructor. Each call passes the desired provider and model via `{ config: { ... } }`:

```typescript
constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
  super();
}

// Claude call
const result = await this.llmGenerateText.call(
  { prompt: args.prompt },
  {
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      system: 'You are a helpful assistant. Keep your response brief.',
    },
  },
);

// OpenAI call
const result = await this.llmGenerateText.call(
  { prompt: state.prompt },
  {
    config: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      system: 'You are a helpful assistant. Keep your response brief.',
    },
  },
);
```

### Module setup

Import both provider modules. The adapter tools are available globally via `LlmProviderModule`:

```typescript
@Module({
  imports: [LoopCoreModule, ClaudeModule, OpenAiModule],
  providers: [LlmMultiProviderWorkflow],
})
export class LlmMultiProviderExampleModule {}
```

### App registration

Register the module in your app with `@StudioApp` so workflows appear in Studio:

```typescript
import { StudioApp } from '@loopstack/common';
import {
  LlmMultiProviderExampleModule,
  LlmMultiProviderWorkflow,
} from '@loopstack/llm-multi-provider-example-workflow';

@StudioApp({
  title: 'Multi-Provider Example',
  workflows: [LlmMultiProviderWorkflow],
})
@Module({
  imports: [LlmMultiProviderExampleModule],
})
export class MyAppModule {}
```

## Full Workflow

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

interface LlmMultiProviderState {
  prompt: string;
}

const LlmMultiProviderSchema = z.object({
  prompt: z.string().default('What is the meaning of life? Answer in one sentence.'),
});
type LlmMultiProviderArgs = z.infer<typeof LlmMultiProviderSchema>;

@Workflow({
  title: 'LLM Multi-Provider',
  description: 'Runs the same prompt through Claude and OpenAI side by side',
  widget: __dirname + '/llm-multi-provider.ui.yaml',
  schema: LlmMultiProviderSchema,
})
export class LlmMultiProviderWorkflow extends BaseWorkflow<LlmMultiProviderArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'claude_done' })
  async askClaude(state: LlmMultiProviderState, ctx: RunContext<LlmMultiProviderArgs>) {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: ctx.args.prompt });

    const result = await this.llmGenerateText.call(
      { prompt: ctx.args.prompt },
      {
        config: {
          save: false,
          provider: 'claude',
          model: 'claude-sonnet-4-6',
          system: 'You are a helpful assistant. Keep your response brief.',
        },
      },
    );

    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: `**Claude:** ${result.data.message.text}`,
    });
    this.assignState({ prompt: ctx.args.prompt });
  }

  @Transition({ from: 'claude_done', to: 'openai_done' })
  async askOpenAi(state: LlmMultiProviderState) {
    const result = await this.llmGenerateText.call(
      { prompt: state.prompt },
      {
        config: {
          save: false,
          provider: 'openai',
          model: 'gpt-4o-mini',
          system: 'You are a helpful assistant. Keep your response brief.',
        },
      },
    );

    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: `**OpenAI:** ${result.data.message.text}`,
    });
  }

  @Transition({ from: 'openai_done', to: 'end' })
  done(_state: LlmMultiProviderState) {}
}
```

## How It Works

1. User provides a prompt (defaults to "What is the meaning of life?")
2. The prompt is sent to **Claude** via `this.llmGenerateText.call()` with `config: { provider: 'claude' }`
3. Claude's response is saved as a document
4. The same prompt is sent to **OpenAI** via `this.llmGenerateText.call()` with `config: { provider: 'openai' }`
5. OpenAI's response is saved as a document
6. Both responses are visible in the UI

## Best Practices Demonstrated

- **Same class, different config** — one `LlmGenerateTextTool` instance, different `config` per call
- **Provider-agnostic tool** — the tool class works with any registered provider
- **Explicit provider declaration** — `provider: 'claude'` / `provider: 'openai'` in config makes it clear which provider is used

## Dependencies

- `@loopstack/llm-provider-module` — Adapter tools and shared types
- `@loopstack/claude-module` — Claude LLM provider (registers as `'claude'`)
- `@loopstack/openai-module` — OpenAI LLM provider (registers as `'openai'`)

## Environment Variables

| Variable            | Description                  |
| ------------------- | ---------------------------- |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `OPENAI_API_KEY`    | OpenAI API key               |
