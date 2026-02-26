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
  DocumentInterface,
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockArgsSchema,
  getBlockDocument,
} from '@loopstack/common';
import { AiGenerateToolBaseSchema } from '../schemas/ai-generate-tool-base.schema';
import { AiMessagesHelperService } from '../services';
import { AiProviderModelHelperService } from '../services';

export const AiGenerateObjectSchema = AiGenerateToolBaseSchema.extend({
  response: z.object({
    id: z.string().optional(),
    document: z.string(),
  }),
}).strict();

export type AiGenerateObjectArgsType = z.infer<typeof AiGenerateObjectSchema>;

@Tool({
  config: {
    description: 'Generates a structured object using a LLM',
  },
})
export class AiGenerateObject implements ToolInterface<AiGenerateObjectArgsType> {
  @Inject()
  private readonly aiMessagesHelperService: AiMessagesHelperService;

  @Inject()
  private readonly aiProviderModelHelperService: AiProviderModelHelperService;

  @Input({
    schema: AiGenerateObjectSchema,
  })
  args: AiGenerateObjectArgsType;

  async execute(
    args: AiGenerateObjectArgsType,
    ctx: RunContext,
    parent: WorkflowInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
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
      const messages = this.aiMessagesHelperService.getMessages(metadata.documents, {
        messages: args.messages as unknown as UIMessage[],
        messagesSearchTag: args.messagesSearchTag,
      });

      options.messages = await convertToModelMessages(messages);
    }

    const document = getBlockDocument<DocumentInterface>(parent, args.response.document);
    if (!document) {
      throw new Error(`Document with name "${args.response.document}" not found in tool execution context.`);
    }
    const responseSchema = getBlockArgsSchema(document);
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
      console.log(options.schema);

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
