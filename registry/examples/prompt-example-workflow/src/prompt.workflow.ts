import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, DOCUMENT_STORE, Final, Initial, TEMPLATE_RENDERER, Workflow } from '@loopstack/common';
import type { DocumentStore, TemplateRenderFn, WorkflowContext } from '@loopstack/common';
import type { LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

interface PromptState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
}

@Workflow({
  uiConfig: __dirname + '/prompt.ui.yaml',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow<{ subject: string }, PromptState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Initial({ to: 'prompt_executed' })
  async prompt(ctx: WorkflowContext, args: { subject: string }, state: PromptState): Promise<PromptState> {
    const result = await this.llmGenerateText.call(
      {
        prompt: this.render(__dirname + '/templates/prompt.md', { subject: args.subject }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );
    return { llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Final({ from: 'prompt_executed' })
  async respond(ctx: WorkflowContext, state: PromptState): Promise<unknown> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return {};
  }
}
