import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, DOCUMENT_STORE, Initial, TEMPLATE_RENDERER, Transition, Workflow } from '@loopstack/common';
import type { DocumentStore, TemplateRenderFn, WorkflowContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

interface ChatState {}

@Workflow({
  title: 'LLM Chat Example (Assistant Bob)',
  description:
    'An example workflow that demonstrates how to create a simple chat interface. Messages are processed by an LLM to generate responses.',
  widget: __dirname + '/chat.ui.yaml',
})
export class ChatWorkflow extends BaseWorkflow<Record<string, unknown>, ChatState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Initial({ to: 'waiting_for_user' })
  async setup(ctx: WorkflowContext, args: Record<string, unknown>, state: ChatState): Promise<ChatState> {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'user', content: this.render(__dirname + '/templates/systemMessage.md') },
      { meta: { hidden: true } },
    );
    return state;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(ctx: WorkflowContext, state: ChatState, payload: string): Promise<ChatState> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', content: payload });
    return state;
  }

  @Transition({ from: 'ready', to: 'waiting_for_user' })
  async llmTurn(ctx: WorkflowContext, state: ChatState): Promise<ChatState> {
    const result = await this.llmGenerateText.call({}, { config: { provider: 'claude', model: 'claude-sonnet-4-6' } });

    await this.documentStore.save(LlmMessageDocument, result.data!.message, {
      meta: { response: result.data!.response, provider: (result.metadata as { provider: string })?.provider },
    });
    return state;
  }
}
