import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool } from '@loopstack/llm-provider-module';

const PromptExampleSchema = z.object({
  subject: z.string().default('coffee'),
});
type PromptExampleArgs = z.infer<typeof PromptExampleSchema>;

@Workflow({
  title: 'LLM - Prompt Example (Write a haiku)',
  description:
    'Demonstrates the simplest LLM call pattern: a single prompt rendered from a Handlebars template, generating a haiku about a user-provided subject.',
  schema: PromptExampleSchema,
})
export class PromptExampleWorkflow extends BaseWorkflow<PromptExampleArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'end' })
  async prompt(state: Record<string, unknown>, ctx: RunContext<PromptExampleArgs>) {
    const result = await this.llmGenerateText.call(
      {
        prompt: this.render(join(__dirname, 'templates', 'prompt.md'), { subject: ctx.args.subject }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );
    this.setResult({ text: result.data.message.text });
  }
}
