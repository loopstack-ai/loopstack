import { ModelMessage } from '@ai-sdk/provider-utils';
import { Injectable } from '@nestjs/common';
import { LanguageModel, ToolSet, UIMessage, convertToModelMessages, createUIMessageStream, streamText } from 'ai';
import { z } from 'zod';
import {
  Tool,
  ToolInterface,
  ToolResult,
  WithArguments,
  WorkflowExecution,
  WorkflowInterface,
} from '@loopstack/common';
import { AiGenerateToolBaseSchema } from '../schemas/ai-generate-tool-base.schema';
import { AiMessagesHelperService } from '../services';
import { AiProviderModelHelperService } from '../services';
import { AiToolsHelperService } from '../services';

export const AiGenerateTextSchema = AiGenerateToolBaseSchema.extend({
  tools: z.array(z.string()).optional(),
}).strict();

type AiGenerateTextArgsType = z.infer<typeof AiGenerateTextSchema>;

@Injectable()
@Tool({
  config: {
    description: 'Generates text using a LLM',
  },
})
@WithArguments(AiGenerateTextSchema)
export class AiGenerateText implements ToolInterface<AiGenerateTextArgsType> {
  constructor(
    private readonly aiMessagesHelperService: AiMessagesHelperService,
    private readonly aiToolsHelperService: AiToolsHelperService,
    private readonly aiProviderModelHelperService: AiProviderModelHelperService,
  ) {}

  async execute(
    args: AiGenerateTextArgsType,
    ctx: WorkflowExecution<any>,
    parent: WorkflowInterface,
  ): Promise<ToolResult> {
    const model = this.aiProviderModelHelperService.getProviderModel(args.llm);

    const options: {
      prompt?: string;
      messages: ModelMessage[];
      tools?: Record<string, unknown>;
    } = {
      messages: [],
    };

    options.tools = args.tools ? this.aiToolsHelperService.getTools(args.tools, parent) : undefined;

    if (args.prompt) {
      options.messages.push({
        role: 'user',
        content: args.prompt,
      } as ModelMessage);
    } else {
      const messages = this.aiMessagesHelperService.getMessages(ctx.state.getMetadata('documents'), {
        messages: args.messages as unknown as UIMessage[],
        messagesSearchTag: args.messagesSearchTag,
      });

      options.messages = await convertToModelMessages(messages, {
        tools: options.tools as ToolSet,
      });
    }

    const uiMessage = await this.handleGenerateText(model, options);

    return {
      data: uiMessage,
    };
  }

  private async handleGenerateText(
    model: LanguageModel,
    options: {
      prompt?: string;
      messages?: ModelMessage[];
      tools?: Record<string, unknown>;
    },
  ): Promise<UIMessage> {
    const startTime = performance.now();
    try {
      const result = streamText({
        model,
        ...options,
      } as Parameters<typeof streamText>[0]);

      return new Promise((resolve, reject) => {
        const stream = createUIMessageStream({
          execute({ writer }) {
            writer.merge(
              result.toUIMessageStream({
                sendReasoning: true,
              }),
            );
          },
          onFinish: (data) => {
            resolve(data.responseMessage);
          },
        });

        // Consume the stream to trigger execution
        void (async () => {
          try {
            const reader = stream.getReader();
            while (true) {
              const { done } = await reader.read();
              if (done) break;
            }
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
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
