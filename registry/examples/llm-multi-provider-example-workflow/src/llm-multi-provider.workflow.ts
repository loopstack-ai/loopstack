import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument, extractText } from '@loopstack/llm-provider-module';

/**
 * Multi-provider LLM example.
 *
 * Demonstrates how to use multiple LLM providers in the same workflow by
 * injecting the same tool class twice with different @InjectTool defaults.
 *
 * Key concepts:
 * - `@InjectTool({ provider, model })` sets default args per injection site
 * - Each injection creates its own proxy with its own defaults
 * - Call sites stay clean — no provider/model args needed
 * - The same tool class (LlmGenerateTextTool) works with any registered provider
 */
@Workflow({
  uiConfig: __dirname + '/llm-multi-provider.ui.yaml',
  schema: z.object({
    prompt: z.string().default('What is the meaning of life? Answer in one sentence.'),
  }),
})
export class LlmMultiProviderWorkflow extends BaseWorkflow<{ prompt: string }> {
  /** Claude-configured LLM tool — defaults to claude-sonnet-4-6 */
  @InjectTool({
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    system: 'You are a helpful assistant. Keep your response brief.',
  })
  claudeLlm: LlmGenerateTextTool;

  /** OpenAI-configured LLM tool — defaults to gpt-4o-mini */
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
      content: `**Claude:** ${extractText(result.data!)}`,
    });
  }

  @Transition({ from: 'claude_done', to: 'openai_done' })
  async askOpenAi() {
    const args = this.ctx.run.args as { prompt: string };

    const result = await this.openaiLlm.call({
      prompt: args.prompt,
    });

    await this.repository.save(LlmMessageDocument, {
      role: 'assistant',
      content: `**OpenAI:** ${extractText(result.data!)}`,
    });
  }

  @Final({ from: 'openai_done' })
  async done(): Promise<void> {}
}
