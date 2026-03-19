import Anthropic from '@anthropic-ai/sdk';
import { Inject } from '@nestjs/common';
import { toJSONSchema, z } from 'zod';
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
import { ClaudeGenerateToolBaseSchema } from '../schemas/claude-generate-tool-base.schema';
import { ClaudeClientService } from '../services';
import { ClaudeMessagesHelperService } from '../services';

export const ClaudeGenerateObjectSchema = ClaudeGenerateToolBaseSchema.extend({
  response: z.object({
    id: z.string().optional(),
    document: z.string(),
  }),
}).strict();

export type ClaudeGenerateObjectArgsType = z.infer<typeof ClaudeGenerateObjectSchema>;

const STRUCTURED_OUTPUT_TOOL_NAME = 'structured_output';

@Tool({
  config: {
    description: 'Generates a structured object using the Anthropic Claude API',
  },
})
export class ClaudeGenerateObject implements ToolInterface<ClaudeGenerateObjectArgsType> {
  @Inject()
  private readonly claudeClientService: ClaudeClientService;
  @Inject()
  private readonly claudeMessagesHelperService: ClaudeMessagesHelperService;

  @Input({
    schema: ClaudeGenerateObjectSchema,
  })
  args: ClaudeGenerateObjectArgsType;

  async execute(
    args: ClaudeGenerateObjectArgsType,
    ctx: RunContext,
    parent: WorkflowInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const client = this.claudeClientService.getClient(args.claude);
    const model = this.claudeClientService.getModel(args.claude);

    const messages: Anthropic.MessageParam[] = [];

    if (args.prompt) {
      messages.push({ role: 'user', content: args.prompt });
    } else {
      const resolved = this.claudeMessagesHelperService.getMessages(metadata.documents, {
        messages: args.messages as Anthropic.MessageParam[],
        messagesSearchTag: args.messagesSearchTag,
      });
      messages.push(...resolved);
    }

    const document = getBlockDocument<DocumentInterface>(parent, args.response.document);
    if (!document) {
      throw new Error(`Document with name "${args.response.document}" not found in tool execution context.`);
    }

    const responseSchema = getBlockArgsSchema(document);
    if (!responseSchema) {
      throw new Error('Claude object generation source document must have a schema.');
    }

    const jsonSchema = toJSONSchema(responseSchema);

    const response = await this.handleGenerateObject(client, {
      model,
      messages,
      system: args.system,
      maxTokens: args.claude?.maxTokens,
      inputSchema: jsonSchema as Anthropic.Tool['input_schema'],
    });

    return {
      data: response.data,
      metadata: {
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      },
    };
  }

  private async handleGenerateObject(
    client: Anthropic,
    options: {
      model: string;
      messages: Anthropic.MessageParam[];
      system?: string;
      maxTokens?: number;
      inputSchema: Anthropic.Tool['input_schema'];
    },
  ): Promise<{ data: unknown; usage: Anthropic.Usage }> {
    const startTime = performance.now();
    try {
      const response = await client.messages.create({
        model: options.model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 4096,
        ...(options.system ? { system: options.system } : {}),
        tools: [
          {
            name: STRUCTURED_OUTPUT_TOOL_NAME,
            description: 'Return the structured output matching the schema.',
            input_schema: options.inputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: STRUCTURED_OUTPUT_TOOL_NAME },
      });

      const toolUseBlock = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');

      if (!toolUseBlock) {
        throw new Error('Claude did not return a tool_use block for structured output.');
      }

      return {
        data: toolUseBlock.input,
        usage: response.usage,
      };
    } catch (error) {
      const errorResponseTime = performance.now() - startTime;
      console.error(`Request failed after ${errorResponseTime}ms:`, error);
      throw error;
    }
  }
}
