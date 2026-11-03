import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider';

interface CallUsage {
  question: string;
  answer: string;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

interface PromptCachingState {
  firstCall?: CallUsage;
}

const PromptCachingArgsSchema = z.object({
  firstQuestion: z.string().default('How much does a 60-minute ride cost on the Monthly plan?'),
  secondQuestion: z.string().default('What happens if a station is full when I want to return a bike?'),
});

type PromptCachingArgs = z.infer<typeof PromptCachingArgsSchema>;

@Workflow({
  title: 'LLM - Prompt Caching Example',
  description:
    'Asks Claude two questions about the same long handbook with prompt caching turned on (providerConfig.cache). The first call writes the handbook to the cache, the second call reads it from there. Shows the cache-write and cache-read tokens of each call.',
  schema: PromptCachingArgsSchema,
})
export class PromptCachingExampleWorkflow extends BaseWorkflow<PromptCachingArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'first_answered' })
  async askFirst(state: PromptCachingState, ctx: RunContext<PromptCachingArgs>) {
    this.assignState({ firstCall: await this.ask(ctx.args.firstQuestion) });
  }

  @Transition({ from: 'first_answered', to: 'end' })
  async askSecond(state: PromptCachingState, ctx: RunContext<PromptCachingArgs>) {
    const calls = [state.firstCall!, await this.ask(ctx.args.secondQuestion)];

    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: calls
        .map(
          (call, i) =>
            `**Call ${i + 1}:** cache write ${call.cacheCreationInputTokens} tokens, ` +
            `cache read ${call.cacheReadInputTokens} tokens`,
        )
        .join('\n\n'),
    });
    this.setResult({ calls });
  }

  /** Both calls send the same system prompt, so they share the prefix the cache stores. */
  private async ask(question: string): Promise<CallUsage> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: question });

    const result = await this.llmGenerateText.call(
      { prompt: question },
      {
        config: {
          provider: 'claude',
          model: 'claude-sonnet-4-6',
          system: this.render(join(__dirname, 'templates', 'handbook.md')),
          providerConfig: { cache: true },
        },
      },
    );

    const { usage } = result.metadata;
    return {
      question,
      answer: result.data.message.text,
      cacheCreationInputTokens: usage?.cacheCreationInputTokens ?? 0,
      cacheReadInputTokens: usage?.cacheReadInputTokens ?? 0,
    };
  }
}
