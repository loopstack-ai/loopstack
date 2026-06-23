import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool } from '@loopstack/llm-provider-module';

const PromptSchema = z.object({
  subject: z.string().default('coffee'),
});
type PromptArgs = z.infer<typeof PromptSchema>;

@Workflow({
  title: 'Simple Prompt Example (Write a haiku)',
  description:
    'An example workflow that demonstrates how to use a prompt to generate a haiku about a given subject using an LLM.',
  schema: PromptSchema,
})
export class PromptWorkflow extends BaseWorkflow<PromptArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'end' })
  async prompt(state: Record<string, unknown>, ctx: RunContext<PromptArgs>) {
    await this.llmGenerateText.call(
      {
        prompt: this.render(join(__dirname, 'templates', 'prompt.md'), { subject: ctx.args.subject }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );
  }
}
