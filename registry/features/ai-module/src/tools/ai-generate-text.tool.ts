import { ModelMessage } from '@ai-sdk/provider-utils';
import { Inject, Injectable } from '@nestjs/common';
import { LanguageModel, ToolSet, UIMessage, convertToModelMessages, createUIMessageStream, streamText } from 'ai';
import { z } from 'zod';
import {
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
  WorkflowMetadataInterface,
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
export class AiGenerateText implements ToolInterface<AiGenerateTextArgsType> {
  @Inject()
  private readonly aiMessagesHelperService: AiMessagesHelperService;
  @Inject()
  private readonly aiToolsHelperService: AiToolsHelperService;
  @Inject()
  private readonly aiProviderModelHelperService: AiProviderModelHelperService;

  @Input({
    schema: AiGenerateTextSchema,
  })
  args: AiGenerateTextArgsType;

  async execute(
    args: AiGenerateTextArgsType,
    ctx: RunContext,
    parent: WorkflowInterface,
    runtime: WorkflowMetadataInterface,
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
      const messages = this.aiMessagesHelperService.getMessages(runtime.documents, {
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
