import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument, extractText } from '@loopstack/llm-provider-module';

/**
 * Multi-provider LLM example.
 *
 * Demonstrates how to use multiple LLM providers in the same workflow by
 * injecting the same tool class twice with different constructor injection defaults.
 *
 * Key concepts:
 * - Each provider/model combo is passed via config at call time
 * - The same tool class (LlmGenerateTextTool) works with any registered provider
 */

interface LlmMultiProviderState {
  prompt: string;
}

@Workflow({
  title: 'LLM Multi-Provider',
  description: 'Runs the same prompt through Claude and OpenAI side by side',
  widget: __dirname + '/llm-multi-provider.ui.yaml',
  schema: z.object({
    prompt: z.string().default('What is the meaning of life? Answer in one sentence.'),
  }),
})
export class LlmMultiProviderWorkflow extends BaseWorkflow<{ prompt: string }, LlmMultiProviderState> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'claude_done' })
  async askClaude(state: LlmMultiProviderState, ctx: RunContext): Promise<LlmMultiProviderState> {
    const args = ctx.args as { prompt: string };
    await this.documentStore.save(LlmMessageDocument, { role: 'user', content: args.prompt });

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

    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      content: `**Claude:** ${extractText(result.data!)}`,
    });
    return { ...state, prompt: args.prompt };
  }

  @Transition({ from: 'claude_done', to: 'openai_done' })
  async askOpenAi(state: LlmMultiProviderState): Promise<LlmMultiProviderState> {
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

    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      content: `**OpenAI:** ${extractText(result.data!)}`,
    });
    return state;
  }

  @Transition({ from: 'openai_done', to: 'end' })
  async done(_state: LlmMultiProviderState): Promise<unknown> {
    return {};
  }
}
