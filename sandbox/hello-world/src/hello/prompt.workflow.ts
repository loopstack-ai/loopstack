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

interface PromptState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
}

@Workflow({
  title: 'Simple Prompt',
  description: 'Generate a haiku about a given subject using an LLM.',
  uiConfig: {
    title: 'Simple Prompt',
    description: 'Generate a haiku about a given subject using an LLM.',
  },
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow<
  { subject: string },
  PromptState
> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'prompt_executed' })
  async prompt(
    ctx: WorkflowContext,
    args: { subject: string },
    state: PromptState,
  ): Promise<PromptState> {
    const result = await this.llmGenerateText.call({
      prompt: `Write a haiku about ${args.subject}`,
    });
    return {
      llmResult: result.data,
      llmMeta: result.metadata,
    };
  }

  @Final({ from: 'prompt_executed' })
  async respond(ctx: WorkflowContext, state: PromptState): Promise<unknown> {
    await this.documentStore.save(
      LlmMessageDocument,
      state.llmResult!.message,
      {
        meta: {
          response: state.llmResult!.response,
          provider: state.llmMeta!.provider,
        },
      },
    );
    return {};
  }
}
