import { ModelMessage } from '@ai-sdk/provider-utils';
import { Inject } from '@nestjs/common';
import {
  GenerateTextResult,
  LanguageModel,
  Output,
  ToolSet,
  UIMessage,
  convertToModelMessages,
  generateText,
} from 'ai';
import { z } from 'zod';
import {
  BaseTool,
  DocumentClass,
  Tool,
  ToolResult,
  getBlockTypeFromMetadata,
  getDocumentSchema,
} from '@loopstack/common';
import { AiGenerateToolBaseSchema } from '../schemas/ai-generate-tool-base.schema';
import { AiMessagesHelperService } from '../services';
import { AiProviderModelHelperService } from '../services';

export const AiGenerateObjectSchema = AiGenerateToolBaseSchema.extend({
  response: z.object({
    id: z.string().optional(),
    document: z.custom<DocumentClass>(
      (val) => typeof val === 'function' && getBlockTypeFromMetadata(val as object) === 'document',
    ),
  }),
}).strict();

export type AiGenerateObjectArgsType = z.infer<typeof AiGenerateObjectSchema>;

@Tool({
  uiConfig: {
    description: 'Generates a structured object using a LLM',
  },
  schema: AiGenerateObjectSchema,
})
export class AiGenerateObject extends BaseTool {
  @Inject()
  private readonly aiMessagesHelperService: AiMessagesHelperService;

  @Inject()
  private readonly aiProviderModelHelperService: AiProviderModelHelperService;

  async call(args: AiGenerateObjectArgsType): Promise<ToolResult> {
    const model = this.aiProviderModelHelperService.getProviderModel(args.llm);

    const options: {
      messages: ModelMessage[];
      schema?: z.ZodSchema;
    } = {
      messages: [],
    };

    if (args.prompt) {
      options.messages.push({
        role: 'user',
        content: args.prompt,
      } as ModelMessage);
    } else {
      const messages = this.aiMessagesHelperService.getMessages(this.ctx.runtime.documents, {
        messages: args.messages as unknown as UIMessage[],
        messagesSearchTag: args.messagesSearchTag,
      });

      options.messages = await convertToModelMessages(messages);
    }

    const responseSchema = getDocumentSchema(args.response.document);
    if (!responseSchema) {
      throw new Error(`AI object generation source document must have a schema.`);
    }

    options.schema = responseSchema;

    const response = await this.handleGenerateObject(model, options);

    return {
      data: response.output,
      metadata: {
        usage: {
          inputTokens: response.usage.inputTokens ?? 0,
          outputTokens: response.usage.outputTokens ?? 0,
        },
      },
    };
  }

  private async handleGenerateObject(
    model: LanguageModel,
    options: {
      messages: ModelMessage[];
      schema?: z.ZodSchema;
    },
  ): Promise<GenerateTextResult<ToolSet, any>> {
    const startTime = performance.now();
    try {
      return generateText({
        model,
        messages: options.messages,
        ...(options.schema ? { output: Output.object({ schema: options.schema }) } : {}),
      });
    } catch (error) {
      const errorResponseTime = performance.now() - startTime;
      console.error(`Request failed after ${errorResponseTime}ms:`, error);
      throw error;
    }
  }
}
