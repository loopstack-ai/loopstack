import Anthropic from '@anthropic-ai/sdk';
import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseTool,
  Tool,
  ToolCallEntry,
  ToolCallsMap,
  ToolInterface,
  ToolResult,
  ToolSideEffects,
  getBlockTool,
} from '@loopstack/common';
import { ClaudeGenerateToolBaseSchema } from '../schemas/claude-generate-tool-base.schema';
import { ClaudeClientService } from '../services';
import { ClaudeMessagesHelperService } from '../services';
import { ClaudeToolsHelperService } from '../services';
import { applyCacheBreakpoints } from '../utils/cache.utils';

export const ClaudeGenerateTextSchema = ClaudeGenerateToolBaseSchema.extend({
  tools: z.array(z.string()).optional(),
  document: z.string().optional(),
}).strict();

type ClaudeGenerateTextArgsType = z.infer<typeof ClaudeGenerateTextSchema>;

@Tool({
  uiConfig: {
    description: 'Generates text using the Anthropic Claude API',
  },
  schema: ClaudeGenerateTextSchema,
})
export class ClaudeGenerateText extends BaseTool {
  @Inject()
  private readonly claudeClientService: ClaudeClientService;
  @Inject()
  private readonly claudeMessagesHelperService: ClaudeMessagesHelperService;
  @Inject()
  private readonly claudeToolsHelperService: ClaudeToolsHelperService;

  async call(args: ClaudeGenerateTextArgsType): Promise<ToolResult> {
    const client = this.claudeClientService.getClient(args.claude);
    const model = this.claudeClientService.getModel(args.claude);

    const messages: Anthropic.MessageParam[] = [];

    if (args.prompt) {
      messages.push({ role: 'user', content: args.prompt });
    } else {
      const resolved = this.claudeMessagesHelperService.getMessages(this.ctx.runtime.documents, {
        messages: args.messages as Anthropic.MessageParam[],
        messagesSearchTag: args.messagesSearchTag,
      });
      messages.push(...resolved);
    }

    const tools = args.tools ? this.claudeToolsHelperService.getTools(args.tools, this.ctx.parent) : undefined;

    const response = await this.handleGenerateText(client, {
      model,
      messages,
      system: args.system,
      maxTokens: args.claude?.maxTokens,
      tools,
      cache: args.claude?.cache,
    });

    const toolCalls = this.extractToolCalls(response);

    let effects: ToolSideEffects[] = [];

    if (args.document) {
      const docResult = await this.createResponseMessage(args.document, response);
      if (docResult.effects) {
        effects = [...docResult.effects];
      }
    }

    return {
      data: {
        ...response,
        ...(toolCalls ? { toolCalls } : {}),
      },
      ...(effects.length > 0 ? { effects } : {}),
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

  private async createResponseMessage(document: string, response: Anthropic.Message): Promise<ToolResult> {
    const createDocumentTool = getBlockTool<ToolInterface>(this.ctx.parent, 'createDocument');
    if (!createDocumentTool) {
      throw new Error('createDocument tool not found in parent context.');
    }

    return (createDocumentTool as BaseTool).call({
      id: response.id,
      document,
      update: {
        content: response,
      },
    });
  }

  private extractToolCalls(response: Anthropic.Message): ToolCallsMap | null {
    if (response.stop_reason !== 'tool_use') {
      return null;
    }

    const toolCalls: ToolCallsMap = {};
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolCalls[block.name] = {
          id: block.id,
          name: block.name,
          input: block.input,
        } satisfies ToolCallEntry;
      }
    }

    return Object.keys(toolCalls).length > 0 ? toolCalls : null;
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
