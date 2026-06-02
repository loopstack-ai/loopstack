# LLM Multi-Provider Example

Demonstrates how to use multiple LLM providers (Claude and OpenAI) in the same workflow. The same prompt is sent to both providers and the responses are displayed side by side.

## Key Concepts

### Multiple injections with different defaults

The same tool class (`LlmGenerateTextTool`) is injected twice with different `@InjectTool` defaults — each pre-configured for its provider:

```typescript
@InjectTool({
  provider: 'claude',
  model: 'claude-sonnet-4-6',
  system: 'You are a helpful assistant. Keep your response brief.',
})
claudeLlm: LlmGenerateTextTool;

@InjectTool({
  provider: 'openai',
  model: 'gpt-4o-mini',
  system: 'You are a helpful assistant. Keep your response brief.',
})
openaiLlm: LlmGenerateTextTool;
```

Each injection creates its own proxy with its own defaults. The underlying NestJS singleton is shared, but the defaults are per-injection-site.

### Clean call sites

With defaults set at the injection site, call sites only pass call-specific args:

```typescript
// No provider, model, or system needed — comes from @InjectTool defaults
const result = await this.claudeLlm.call({
  prompt: args.prompt,
});
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

## Full Workflow

```typescript
import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import type { LlmContentBlock, LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({
  uiConfig: __dirname + '/llm-multi-provider.ui.yaml',
  schema: z.object({
    prompt: z.string().default('What is the meaning of life? Answer in one sentence.'),
  }),
})
export class LlmMultiProviderWorkflow extends BaseWorkflow<{ prompt: string }> {
  @InjectTool({
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    system: 'You are a helpful assistant. Keep your response brief.',
  })
  claudeLlm: LlmGenerateTextTool;

  @InjectTool({
    provider: 'openai',
    model: 'gpt-4o-mini',
    system: 'You are a helpful assistant. Keep your response brief.',
  })
  openaiLlm: LlmGenerateTextTool;

  @Initial({ to: 'claude_done' })
  async askClaude(args: { prompt: string }) {
    await this.repository.save(LlmMessageDocument, { role: 'user', content: args.prompt });

    const result = await this.claudeLlm.call({
      prompt: args.prompt,
    });

    await this.repository.save(LlmMessageDocument, {
      role: 'assistant',
      content: `**Claude:** ${this.extractText(result.data!)}`,
    });
  }

  @Transition({ from: 'claude_done', to: 'openai_done' })
  async askOpenAi() {
    const args = ctx.args as { prompt: string };

    const result = await this.openaiLlm.call({
      prompt: args.prompt,
    });

    await this.repository.save(LlmMessageDocument, {
      role: 'assistant',
      content: `**OpenAI:** ${this.extractText(result.data!)}`,
    });
  }

  @Final({ from: 'openai_done' })
  async done(): Promise<void> {}

  private extractText(result: LlmGenerateTextResult): string {
    const content = result.message.content;
    if (!content || typeof content === 'string') return (content as string) ?? '';
    return (content as LlmContentBlock[])
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');
  }
}
```

## How It Works

1. User provides a prompt (defaults to "What is the meaning of life?")
2. The prompt is sent to **Claude** via the `claudeLlm` tool (pre-configured with `@InjectTool`)
3. Claude's response is saved as a document
4. The same prompt is sent to **OpenAI** via the `openaiLlm` tool
5. OpenAI's response is saved as a document
6. Both responses are visible in the UI

## Best Practices Demonstrated

- **Configure once, call cleanly** — provider and model set at `@InjectTool`, not in every call
- **Same class, different config** — `LlmGenerateTextTool` injected twice with different defaults
- **Provider-agnostic code** — call sites don't know which provider they're using
- **Explicit provider declaration** — `provider: 'claude'` in `@InjectTool` makes it clear which provider is used

## Dependencies

- `@loopstack/llm-provider-module` — Adapter tools and shared types
- `@loopstack/claude-module` — Claude LLM provider (registers as `'claude'`)
- `@loopstack/openai-module` — OpenAI LLM provider (registers as `'openai'`)

## Environment Variables

| Variable            | Description                  |
| ------------------- | ---------------------------- |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `OPENAI_API_KEY`    | OpenAI API key               |
