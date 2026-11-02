import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider';

const CustomProviderArgsSchema = z.object({
  message: z.string().default('Hello, custom provider!'),
});

type CustomProviderArgs = z.infer<typeof CustomProviderArgsSchema>;

@Workflow({
  title: 'LLM - Custom Provider Example',
  description:
    'Calls EchoLlmProvider, a minimal custom LLM provider that registers itself with LlmProviderRegistry, through LlmGenerateTextTool with config.provider. Needs no API key: the provider answers with the last user message.',
  schema: CustomProviderArgsSchema,
})
export class CustomProviderExampleWorkflow extends BaseWorkflow<CustomProviderArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'end' })
  async ask(state: Record<string, unknown>, ctx: RunContext<CustomProviderArgs>) {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: ctx.args.message });

    // No prompt: the provider reads the conversation from the saved message documents
    const result = await this.llmGenerateText.call({}, { config: { provider: 'echo', model: 'echo-1' } });

    this.setResult({ text: result.data.message.text });
  }
}
