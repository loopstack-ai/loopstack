import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { DocumentStore } from '@loopstack/core';
import type {
  LlmGenerateTextResult,
  LlmResultMeta,
} from '@loopstack/llm-provider-module';
import {
  LlmGenerateTextTool,
  LlmMessageDocument,
} from '@loopstack/llm-provider-module';

interface ModelTestState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
}

@Workflow({
  name: 'model_test',
  title: 'Model Test',
  schema: z.object({
    subject: z.string().default('NestJS'),
  }),
})
export class ModelTestWorkflow extends BaseWorkflow<
  { subject: string },
  ModelTestState
> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Transition({ to: 'done' })
  async prompt(
    state: ModelTestState,
    ctx: LoopstackContext,
  ): Promise<ModelTestState> {
    const args = ctx.args as { subject: string };
    // No model override here — relies entirely on the module's forFeature config
    const result = await this.llmGenerateText.call({
      prompt: `In one sentence, what is ${args.subject}?`,
    });
    return {
      llmResult: result.data,
      llmMeta: result.metadata,
    };
  }

  @Transition({ from: 'done', to: 'end' })
  async respond(state: ModelTestState): Promise<unknown> {
    await this.documentStore.save(
      LlmMessageDocument,
      state.llmResult!.message,
      {
        meta: {
          response: state.llmResult!.response,
          provider: state.llmMeta!.provider,
          model: state.llmMeta!.model,
        },
      },
    );
    return {};
  }
}
