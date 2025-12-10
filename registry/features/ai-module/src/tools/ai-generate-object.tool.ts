import { z } from 'zod';
import { ToolResult, BlockConfig, WithArguments } from '@loopstack/common';
import { pick } from 'lodash';
import {
  convertToModelMessages,
  generateObject,
  GenerateObjectResult,
} from 'ai';
import { ToolBase, WorkflowBase } from '@loopstack/core';
import { AiMessagesHelperService } from '../services';
import { AiProviderModelHelperService } from '../services';
import { WorkflowExecution } from '@loopstack/core/dist/workflow-processor/interfaces/workflow-execution.interface';
import { Block } from '@loopstack/core/dist/workflow-processor/abstract/block.abstract';
import { AiGenerateToolBaseSchema } from '../schemas/ai-generate-tool-base.schema';

export const AiGenerateObjectSchema = AiGenerateToolBaseSchema.extend({
  responseDocument: z.string(),
}).strict();

export type AiGenerateObjectArgsType = z.infer<typeof AiGenerateObjectSchema>;

@BlockConfig({
  config: {
    description: 'Generates a structured object using a LLM',
  },
})
@WithArguments(AiGenerateObjectSchema)
export class AiGenerateObject extends ToolBase<AiGenerateObjectArgsType> {
  constructor(
    private readonly aiMessagesHelperService: AiMessagesHelperService,
    private readonly aiProviderModelHelperService: AiProviderModelHelperService,
  ) {
    super();
  }

  async execute(
    args: AiGenerateObjectArgsType,
    ctx: WorkflowExecution,
    parent: WorkflowBase,
  ): Promise<ToolResult> {
    const model = this.aiProviderModelHelperService.getProviderModel(args.llm);

    const options: any = {};

    if (args.prompt) {
      options.prompt = args.prompt;
    } else {
      const messages = this.aiMessagesHelperService.getMessages(
        ctx.state.getMetadata('documents'),
        pick(args, ['prompt', 'messages', 'messagesSearchTag']),
      );
      options.messages = convertToModelMessages(messages);
    }

    const document: Block = parent.getDocument(args.responseDocument);
    const responseSchema = document.argsSchema;
    if (!responseSchema) {
      throw new Error(
        `AI object generation source document must have a schema.`,
      );
    }

    options.schema = responseSchema;

    const response: GenerateObjectResult<any> = await this.handleGenerateObject(
      model,
      options,
    );

    return {
      data: response.object,
    };
  }

  private async handleGenerateObject(
    model: any,
    options: any,
  ): Promise<GenerateObjectResult<any>> {
    const startTime = performance.now();
    try {
      return generateObject({
        model,
        ...options,
      });
    } catch (error) {
      const errorResponseTime = performance.now() - startTime;
      console.error(`Request failed after ${errorResponseTime}ms:`, error);
      throw error;
    }
  }
}
