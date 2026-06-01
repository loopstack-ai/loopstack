import { z } from 'zod';
import { BaseWorkflow, Final, Initial, Workflow } from '@loopstack/common';
import type { WorkflowContext } from '@loopstack/common';
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

  @Initial({ to: 'done' })
  async prompt(
    ctx: WorkflowContext,
    args: { subject: string },
    state: ModelTestState,
  ): Promise<ModelTestState> {
    // No model override here — relies entirely on the module's forFeature config
    const result = await this.llmGenerateText.call({
      prompt: `In one sentence, what is ${args.subject}?`,
    });
    return {
      llmResult: result.data,
      llmMeta: result.metadata as LlmResultMeta | undefined,
    };
  }

  @Final({ from: 'done' })
  async respond(ctx: WorkflowContext, state: ModelTestState): Promise<unknown> {
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
