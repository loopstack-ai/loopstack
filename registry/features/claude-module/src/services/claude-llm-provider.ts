import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DocumentEntity } from '@loopstack/common';
import type {
  LlmContext,
  LlmGenerateObjectArgs,
  LlmGenerateObjectResult,
  LlmGenerateTextArgs,
  LlmGenerateTextResult,
  LlmNormalizedMessage,
  LlmProviderInterface,
  LlmStopReason,
  LlmUsage,
} from '@loopstack/llm-provider-module';
import { LlmNormalizedMessageSchema, LlmProviderRegistry } from '@loopstack/llm-provider-module';
import type { ClaudeProviderConfig } from '../types/index.js';
import { applyCacheBreakpoints } from '../utils/cache.utils.js';
import { ClaudeClientService } from './claude-client.service.js';

@Injectable()
export class ClaudeLlmProvider implements LlmProviderInterface<ClaudeProviderConfig>, OnModuleInit {
  readonly providerId = 'claude';
  private readonly logger = new Logger(ClaudeLlmProvider.name);

  constructor(
    private readonly registry: LlmProviderRegistry,
    private readonly clientService: ClaudeClientService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
    this.logger.log('Claude LLM provider registered');
  }

  // ---------------------------------------------------------------------------
  // generateText
  // ---------------------------------------------------------------------------

  async generateText(args: LlmGenerateTextArgs<ClaudeProviderConfig>, ctx: LlmContext): Promise<LlmGenerateTextResult> {
    const pc = args.providerConfig;
    const config = { model: args.model, envApiKey: pc?.envApiKey };
    const client = this.clientService.getClient(config);
    const model = this.clientService.getModel(config);

    const messages = this.resolveMessages(args, ctx.documents);

    const resolvedTools = args.tools ?? undefined;

    const tools = resolvedTools
      ? (resolvedTools.map((t) =>
          t.type === 'tool'
            ? {
                name: t.name,
                description: t.description,
                input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
              }
            : t.config,
        ) as Anthropic.Tool[])
      : undefined;

    const {
      system: cachedSystem,
      tools: cachedTools,
      messages: cachedMessages,
    } = pc?.cache
      ? applyCacheBreakpoints({ system: args.system, tools, messages })
      : { system: args.system, tools, messages };

    const stream = client.messages.stream({
      model,
      messages: cachedMessages,
      max_tokens: pc?.maxTokens ?? 4096,
      ...(cachedSystem ? { system: cachedSystem } : {}),
      ...(cachedTools ? { tools: cachedTools } : {}),
      ...(pc?.temperature != null ? { temperature: pc.temperature } : {}),
      ...(pc?.stopSequences?.length ? { stop_sequences: pc.stopSequences } : {}),
    });

    if (args.onStream && args.streamMessageId) {
      stream.on('text', (delta) => {
        if (delta) {
          void args.onStream?.({ type: 'text_delta', messageId: args.streamMessageId!, delta });
        }
      });
      // Tool-use args accumulate as JSON deltas — the completed content
      // block is the earliest moment the full call is known.
      stream.on('contentBlock', (block) => {
        if (block.type === 'tool_use') {
          void args.onStream?.({
            type: 'tool_call',
            messageId: args.streamMessageId!,
            id: block.id,
            name: block.name,
            args: (block.input ?? {}) as Record<string, unknown>,
          });
        }
      });
    }

    const response = await stream.finalMessage();

    return {
      message: this.normalizeResponse(response),
      response,
    };
  }

  // ---------------------------------------------------------------------------
  // generateObject
  // ---------------------------------------------------------------------------

  async generateObject(
    args: LlmGenerateObjectArgs<ClaudeProviderConfig>,
    ctx: LlmContext,
  ): Promise<LlmGenerateObjectResult> {
    const pc = args.providerConfig;
    const config = { model: args.model, envApiKey: pc?.envApiKey };
    const client = this.clientService.getClient(config);
    const model = this.clientService.getModel(config);

    const messages = this.resolveMessages(args, ctx.documents);

    const structuredTool: Anthropic.Tool = {
      name: 'structured_output',
      description: 'Return the structured output matching the schema.',
      input_schema: args.outputSchema as Anthropic.Tool['input_schema'],
    };

    const {
      system,
      tools,
      messages: cachedMessages,
    } = pc?.cache
      ? applyCacheBreakpoints({ system: args.system, tools: [structuredTool], messages })
      : { system: args.system, tools: [structuredTool], messages };

    const response = await client.messages.create({
      model,
      messages: cachedMessages,
      max_tokens: pc?.maxTokens ?? 4096,
      ...(system ? { system } : {}),
      tools: tools!,
      tool_choice: { type: 'tool', name: 'structured_output' },
      ...(pc?.temperature != null ? { temperature: pc.temperature } : {}),
    });

    const toolUseBlock = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');

    if (!toolUseBlock) {
      throw new Error('LLM did not return structured output.');
    }

    return {
      data: toolUseBlock.input,
      response,
    };
  }

  // ---------------------------------------------------------------------------
  // extractUsage
  // ---------------------------------------------------------------------------

  extractUsage(response: unknown): LlmUsage | undefined {
    const r = response as Anthropic.Message;
    if (!r?.usage) return undefined;
    return {
      inputTokens: r.usage.input_tokens,
      outputTokens: r.usage.output_tokens,
      cacheCreationInputTokens: r.usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: r.usage.cache_read_input_tokens ?? 0,
    };
  }

  // ---------------------------------------------------------------------------
  // toProviderMessage
  // ---------------------------------------------------------------------------

  toProviderMessage(message: LlmNormalizedMessage): Anthropic.MessageParam {
    const sourceBlocks = message.blocks ?? [];
    if (sourceBlocks.length === 0) {
      return { role: message.role, content: message.text };
    }
    const blocks: Anthropic.ContentBlockParam[] = sourceBlocks.map((b) => {
      switch (b.type) {
        case 'text':
          return { type: 'text', text: b.text };
        case 'thinking':
          return { type: 'thinking', thinking: b.text, signature: '' } as Anthropic.ContentBlockParam;
        case 'tool_call':
          return { type: 'tool_use', id: b.id, name: b.name, input: b.args };
        case 'tool_result':
          return { type: 'tool_result', tool_use_id: b.toolCallId, content: b.content, is_error: b.isError };
        default:
          return { type: 'text', text: message.text };
      }
    });
    return { role: message.role, content: blocks };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveMessages(
    args: Pick<LlmGenerateTextArgs, 'prompt' | 'messages' | 'messagesSearchTag'>,
    documents: DocumentEntity[],
  ): Anthropic.MessageParam[] {
    if (args.prompt) {
      return [{ role: 'user', content: args.prompt }];
    }

    if (args.messages?.length) {
      return args.messages.map((m) =>
        this.toProviderMessage({ role: m.role, text: m.text, blocks: m.blocks } as LlmNormalizedMessage),
      );
    }

    const tag = args.messagesSearchTag ?? 'message';
    return documents
      .filter((doc) => !doc.isInvalidated && doc.tags?.includes(tag))
      .sort((a, b) => a.index - b.index)
      .flatMap((doc) => {
        const message = doc.content as LlmNormalizedMessage;

        // Tool result document — map to Claude's tool_result format
        if (message.blocks?.[0]?.type === 'tool_result') {
          const blocks = message.blocks as Array<{
            type: 'tool_result';
            toolCallId: string;
            content: string;
            isError: boolean;
          }>;
          return [
            {
              role: 'user' as const,
              content: blocks.map((tr) => ({
                type: 'tool_result' as const,
                tool_use_id: tr.toolCallId,
                content: tr.content,
                is_error: tr.isError,
              })),
            },
          ];
        }

        if (doc.meta?.response) {
          // Assistant message — pass native response directly back to API
          const native = doc.meta.response as Anthropic.Message;
          return [{ role: native.role, content: native.content }] as Anthropic.MessageParam[];
        }

        return [this.toProviderMessage(message)];
      });
  }

  private normalizeResponse(response: Anthropic.Message): LlmNormalizedMessage {
    const blocks = response.content.map((block) => {
      switch (block.type) {
        case 'text':
          return { type: 'text' as const, text: block.text };
        case 'thinking':
          return { type: 'thinking' as const, text: block.thinking };
        case 'redacted_thinking':
          return { type: 'thinking' as const, text: '[Reasoning redacted]' };
        case 'tool_use':
          return {
            type: 'tool_call' as const,
            id: block.id,
            name: block.name,
            args: block.input as Record<string, unknown>,
          };
        case 'server_tool_use':
          return {
            type: 'server_tool_use' as const,
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          };
        case 'web_search_tool_result':
          return {
            type: 'server_tool_result' as const,
            toolUseId: block.tool_use_id,
            content: block.content,
          };
        default:
          return { type: 'text' as const, text: JSON.stringify(block) };
      }
    });

    const stopReasonMap: Record<string, LlmStopReason> = {
      end_turn: 'end_turn',
      tool_use: 'tool_use',
      max_tokens: 'max_tokens',
      stop_sequence: 'stop_sequence',
    };

    const text = blocks
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return LlmNormalizedMessageSchema.parse({
      id: response.id,
      role: 'assistant',
      text,
      blocks,
      stopReason: response.stop_reason ? stopReasonMap[response.stop_reason] : 'end_turn',
    });
  }
}
