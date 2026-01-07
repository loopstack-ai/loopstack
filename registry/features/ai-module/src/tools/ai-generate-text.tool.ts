import { z } from 'zod';
import { ToolResult, BlockConfig, WithArguments } from '@loopstack/common';
import { ToolBase, WorkflowBase } from '@loopstack/core';
import { AiMessagesHelperService } from '../services';
import { AiProviderModelHelperService } from '../services';
import { AiToolsHelperService } from '../services';
import {
  convertToModelMessages,
  createUIMessageStream,
  streamText,
  UIMessage,
} from 'ai';
import { WorkflowExecution } from '@loopstack/core/dist/workflow-processor/interfaces/workflow-execution.interface';
import { AiGenerateToolBaseSchema } from '../schemas/ai-generate-tool-base.schema';
import { ModelMessage } from '@ai-sdk/provider-utils';

export const AiGenerateTextSchema = AiGenerateToolBaseSchema.extend({
  tools: z.array(z.string()).optional(),
}).strict();

type AiGenerateTextArgsType = z.infer<typeof AiGenerateTextSchema>;

@BlockConfig({
  config: {
    description: 'Generates text using a LLM',
  },
})
@WithArguments(AiGenerateTextSchema)
export class AiGenerateText extends ToolBase<AiGenerateTextArgsType> {
  constructor(
    private readonly aiMessagesHelperService: AiMessagesHelperService,
    private readonly aiToolsHelperService: AiToolsHelperService,
    private readonly aiProviderModelHelperService: AiProviderModelHelperService,
  ) {
    super();
  }

  async execute(
    args: AiGenerateTextArgsType,
    ctx: WorkflowExecution,
    parent: WorkflowBase,
  ): Promise<ToolResult> {
    const model = this.aiProviderModelHelperService.getProviderModel(args.llm);

    const options: any = {};

    options.tools = args.tools
      ? this.aiToolsHelperService.getTools(args.tools, parent)
      : undefined;

    if (args.prompt) {
      options.prompt = args.prompt;
    } else {
      const messages = this.aiMessagesHelperService.getMessages(
        ctx.state.getMetadata('documents'),
        {
          messages: args.messages as ModelMessage[],
          messagesSearchTag: args.messagesSearchTag,
        },
      );
      options.messages = convertToModelMessages(messages, {
        tools: options.tools,
      });
    }

    const uiMessage = await this.handleGenerateText(model, options);

    return {
      data: uiMessage,
    };
  }

  private async handleGenerateText(
    model: any,
    options: any,
  ): Promise<UIMessage<any, any>> {
    const startTime = performance.now();
    try {
      const result = streamText({
        model,
        ...options,
      });

      return new Promise((resolve, reject) => {
        const stream = createUIMessageStream({
          execute({ writer }) {
            writer.merge(
              result.toUIMessageStream({
                sendReasoning: true,
              }),
            );
          },
          onFinish: async (data) => {
            try {
              resolve(data.responseMessage);
            } catch (error) {
              reject(error);
            }
          },
        });

        // Consume the stream to trigger execution
        (async () => {
          try {
            const reader = stream.getReader();
            while (true) {
              const { done } = await reader.read();
              if (done) break;
            }
          } catch (error) {
            reject(error);
          }
        })();
      });
    } catch (error) {
      const errorResponseTime = performance.now() - startTime;
      console.error(`Request failed after ${errorResponseTime}ms:`, error);
      throw error;
    }
  }
}
