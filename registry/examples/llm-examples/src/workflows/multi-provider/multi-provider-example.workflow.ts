import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

interface MultiProviderState {
  prompt: string;
}

const MultiProviderArgsSchema = z.object({
  prompt: z.string().default('What is the meaning of life? Answer in one sentence.'),
});

type MultiProviderArgs = z.infer<typeof MultiProviderArgsSchema>;

@Workflow({
  title: 'LLM - Multi-Provider Example',
  description:
    'Runs the same prompt through Claude and OpenAI side by side. Demonstrates that the same tool class (LlmGenerateTextTool) works with any registered provider by passing provider/model via config at call time.',
  widget: './multi-provider.ui.yaml',
  schema: MultiProviderArgsSchema,
})
export class MultiProviderExampleWorkflow extends BaseWorkflow<MultiProviderArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'claude_done' })
  async askClaude(state: MultiProviderState, ctx: RunContext<MultiProviderArgs>) {
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
  async askOpenAi(state: MultiProviderState) {
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
  done() {}
}
