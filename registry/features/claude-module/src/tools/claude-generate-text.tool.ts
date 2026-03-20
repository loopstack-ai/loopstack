import Anthropic from '@anthropic-ai/sdk';
import { Inject } from '@nestjs/common';
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
import { ClaudeGenerateToolBaseSchema } from '../schemas/claude-generate-tool-base.schema';
import { ClaudeClientService } from '../services';
import { ClaudeMessagesHelperService } from '../services';
import { ClaudeToolsHelperService } from '../services';
import { applyCacheBreakpoints } from '../utils/cache.utils';

export const ClaudeGenerateTextSchema = ClaudeGenerateToolBaseSchema.extend({
  tools: z.array(z.string()).optional(),
}).strict();

type ClaudeGenerateTextArgsType = z.infer<typeof ClaudeGenerateTextSchema>;

@Tool({
  config: {
    description: 'Generates text using the Anthropic Claude API',
  },
})
export class ClaudeGenerateText implements ToolInterface<ClaudeGenerateTextArgsType> {
  @Inject()
  private readonly claudeClientService: ClaudeClientService;
  @Inject()
  private readonly claudeMessagesHelperService: ClaudeMessagesHelperService;
  @Inject()
  private readonly claudeToolsHelperService: ClaudeToolsHelperService;

  @Input({
    schema: ClaudeGenerateTextSchema,
  })
  args: ClaudeGenerateTextArgsType;

  async execute(
    args: ClaudeGenerateTextArgsType,
    ctx: RunContext,
    parent: WorkflowInterface,
    runtime: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const client = this.claudeClientService.getClient(args.claude);
    const model = this.claudeClientService.getModel(args.claude);

    const messages: Anthropic.MessageParam[] = [];

    if (args.prompt) {
      messages.push({ role: 'user', content: args.prompt });
    } else {
      const resolved = this.claudeMessagesHelperService.getMessages(runtime.documents, {
        messages: args.messages as Anthropic.MessageParam[],
        messagesSearchTag: args.messagesSearchTag,
      });
      messages.push(...resolved);
    }

    const tools = args.tools ? this.claudeToolsHelperService.getTools(args.tools, parent) : undefined;

    const response = await this.handleGenerateText(client, {
      model,
      messages,
      system: args.system,
      maxTokens: args.claude?.maxTokens,
      tools,
      cache: args.claude?.cache,
    });

    return {
      data: response,
      metadata: {
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
          cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
        },
      },
    };
  }

  private async handleGenerateText(
    client: Anthropic,
    options: {
      model: string;
      messages: Anthropic.MessageParam[];
      system?: string;
      maxTokens?: number;
      tools?: Anthropic.Tool[];
      cache?: boolean;
    },
  ): Promise<Anthropic.Message> {
    const { system, tools, messages } = options.cache
      ? applyCacheBreakpoints({ system: options.system, tools: options.tools, messages: options.messages })
      : { system: options.system, tools: options.tools, messages: options.messages };

    const startTime = performance.now();
    try {
      const stream = client.messages.stream({
        model: options.model,
        messages,
        max_tokens: options.maxTokens ?? 4096,
        ...(system ? { system } : {}),
        ...(tools ? { tools } : {}),
      });

      return await stream.finalMessage();
    } catch (error) {
      const errorResponseTime = performance.now() - startTime;
      console.error(`Request failed after ${errorResponseTime}ms:`, error);
      throw error;
    }
  }
}
