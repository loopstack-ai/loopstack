import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

/**
 * Multi-provider LLM example.
 *
 * Demonstrates how to use multiple LLM providers in the same workflow by
 * injecting the same tool class twice with different constructor injection defaults.
 *
 * Key concepts:
 * - Each provider/model combo is passed via config at call time
 * - The same tool class (LlmGenerateTextTool) works with any registered provider
 *
 * Why `save: false`: this workflow renders each provider's response with a
 * `**Claude:**` / `**OpenAI:**` prefix for side-by-side comparison in Studio.
 * `LlmGenerateTextTool` would otherwise auto-save the raw assistant message,
 * which would duplicate the prefixed manual save we do below. Opting out of
 * the default save leaves us in full control of how the response is persisted.
 */

interface LlmMultiProviderState {
  prompt: string;
}

const LlmMultiProviderArgsSchema = z.object({
  prompt: z.string().default('What is the meaning of life? Answer in one sentence.'),
});

type LlmMultiProviderArgs = z.infer<typeof LlmMultiProviderArgsSchema>;

@Workflow({
  title: 'LLM Multi-Provider',
  description: 'Runs the same prompt through Claude and OpenAI side by side',
  widget: __dirname + '/llm-multi-provider.ui.yaml',
  schema: LlmMultiProviderArgsSchema,
})
export class LlmMultiProviderWorkflow extends BaseWorkflow<LlmMultiProviderArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'claude_done' })
  async askClaude(state: LlmMultiProviderState, ctx: RunContext<LlmMultiProviderArgs>): Promise<LlmMultiProviderState> {
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
      text: `**Claude:** ${result.data!.message.text}`,
    });
    return { ...state, prompt: ctx.args.prompt };
  }

  @Transition({ from: 'claude_done', to: 'openai_done' })
  async askOpenAi(state: LlmMultiProviderState): Promise<LlmMultiProviderState> {
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
      text: `**OpenAI:** ${result.data!.message.text}`,
    });
    return state;
  }

  @Transition({ from: 'openai_done', to: 'end' })
  async done(_state: LlmMultiProviderState): Promise<unknown> {
    return {};
  }
}
