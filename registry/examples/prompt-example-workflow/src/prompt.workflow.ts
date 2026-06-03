import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, TEMPLATE_RENDERER, Transition, Workflow } from '@loopstack/common';
import type { LoopstackContext, TemplateRenderFn } from '@loopstack/common';
import type { LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

interface PromptState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
}

@Workflow({
  title: 'Simple Prompt Example (Write a haiku)',
  description:
    'An example workflow that demonstrates how to use a prompt to generate a haiku about a given subject using an LLM.',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow<{ subject: string }, PromptState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'prompt_executed' })
  async prompt(state: PromptState, ctx: LoopstackContext): Promise<PromptState> {
    const args = ctx.args as { subject: string };
    const result = await this.llmGenerateText.call(
      {
        prompt: this.render(__dirname + '/templates/prompt.md', { subject: args.subject }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );
    return { llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: PromptState): Promise<unknown> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return {};
  }
}
