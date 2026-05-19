import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
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
import { LlmNormalizedMessageSchema, LlmProviderRegistry, LlmToolsHelperService } from '@loopstack/llm-provider-module';
import type { OpenAiProviderConfig } from '../types/index.js';
import { OpenAiClientService } from './openai-client.service.js';

@Injectable()
export class OpenAiLlmProvider implements LlmProviderInterface<OpenAiProviderConfig>, OnModuleInit {
  readonly providerId = 'openai';
  private readonly logger = new Logger(OpenAiLlmProvider.name);

  constructor(
    private readonly registry: LlmProviderRegistry,
    private readonly clientService: OpenAiClientService,
    private readonly toolsHelper: LlmToolsHelperService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
    this.logger.log('OpenAI LLM provider registered');
  }

  // ---------------------------------------------------------------------------
  // generateText
  // ---------------------------------------------------------------------------

  async generateText(args: LlmGenerateTextArgs<OpenAiProviderConfig>, ctx: LlmContext): Promise<LlmGenerateTextResult> {
    const pc = args.providerConfig;
    const config = { model: args.model, envApiKey: pc?.envApiKey };
    const client = this.clientService.getClient(config);
    const model = this.clientService.getModel(config, 'gpt-4o');

    const messages = this.resolveMessages(args, ctx.documents);

    const openAiMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (args.system) {
      openAiMessages.push({ role: 'system', content: args.system });
    }
    openAiMessages.push(...messages);

    const resolvedTools = args.tools ? this.toolsHelper.getTools(args.tools, ctx.parent, ctx.workspace) : undefined;

    const tools = resolvedTools
      ? resolvedTools
          .filter((t) => t.type === 'tool')
          .map(
            (def): OpenAI.ChatCompletionTool => ({
              type: 'function',
              function: {
                name: def.name,
                description: def.description,
                parameters: def.inputSchema,
              },
            }),
          )
      : undefined;

    const response = await client.chat.completions.create({
      model,
      messages: openAiMessages,
      max_tokens: pc?.maxTokens ?? 4096,
      ...(tools?.length ? { tools } : {}),
      ...(pc?.temperature != null ? { temperature: pc.temperature } : {}),
      ...(pc?.stopSequences?.length ? { stop: pc.stopSequences } : {}),
      ...(pc?.frequencyPenalty != null ? { frequency_penalty: pc.frequencyPenalty } : {}),
      ...(pc?.presencePenalty != null ? { presence_penalty: pc.presencePenalty } : {}),
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('OpenAI returned no choices.');
    }

    return {
      message: this.normalizeResponse(choice, response.id),
      response,
    };
  }

  // ---------------------------------------------------------------------------
  // generateObject
  // ---------------------------------------------------------------------------

  async generateObject(
    args: LlmGenerateObjectArgs<OpenAiProviderConfig>,
    ctx: LlmContext,
  ): Promise<LlmGenerateObjectResult> {
    const pc = args.providerConfig;
    const config = { model: args.model, envApiKey: pc?.envApiKey };
    const client = this.clientService.getClient(config);
    const model = this.clientService.getModel(config, 'gpt-4o');

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (args.system) {
      messages.push({ role: 'system', content: args.system });
    }
    messages.push(...this.resolveMessages(args, ctx.documents));

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: pc?.maxTokens ?? 4096,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'structured_output',
          schema: args.outputSchema,
          strict: true,
        },
      },
      ...(pc?.temperature != null ? { temperature: pc.temperature } : {}),
    });

    const choice = response.choices[0];
    if (!choice?.message.content) {
      throw new Error('OpenAI returned no structured output.');
    }

    let data: unknown;
    try {
      data = JSON.parse(choice.message.content);
    } catch {
      throw new Error('OpenAI returned invalid JSON for structured output.');
    }

    return {
      data,
      response,
    };
  }

  // ---------------------------------------------------------------------------
  // extractUsage
  // ---------------------------------------------------------------------------

  extractUsage(response: unknown): LlmUsage | undefined {
    const r = response as OpenAI.ChatCompletion;
    if (!r?.usage) return undefined;
    const cachedTokens = r.usage.prompt_tokens_details?.cached_tokens ?? 0;
    return {
      inputTokens: r.usage.prompt_tokens - cachedTokens,
      outputTokens: r.usage.completion_tokens ?? 0,
      cacheReadInputTokens: cachedTokens,
      reasoningTokens: r.usage.completion_tokens_details?.reasoning_tokens ?? 0,
    };
  }

  // ---------------------------------------------------------------------------
  // toProviderMessage
  // ---------------------------------------------------------------------------

  toProviderMessage(content: LlmNormalizedMessage): OpenAI.ChatCompletionMessageParam {
    const text =
      typeof content.content === 'string'
        ? content.content
        : content.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as { type: 'text'; text: string }).text)
            .join('\n');
    return { role: content.role as 'user' | 'assistant', content: text };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveMessages(
    args: Pick<LlmGenerateTextArgs, 'prompt' | 'messages' | 'messagesSearchTag'>,
    documents: DocumentEntity[],
  ): OpenAI.ChatCompletionMessageParam[] {
    if (args.prompt) {
      return [{ role: 'user', content: args.prompt }];
    }

    if (args.messages?.length) {
      return args.messages.map(
        (msg): OpenAI.ChatCompletionMessageParam => ({
          role: msg.role as 'user' | 'assistant',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        }),
      );
    }

    const tag = args.messagesSearchTag ?? 'message';
    const msgs: OpenAI.ChatCompletionMessageParam[] = [];

    const docs = documents
      .filter((doc) => !doc.isInvalidated && doc.tags?.includes(tag))
      .sort((a, b) => a.index - b.index);

    for (const doc of docs) {
      const content = doc.content as LlmNormalizedMessage;

      // Tool result document — map to OpenAI's tool role messages
      if (Array.isArray(content.content) && content.content[0]?.type === 'tool_result') {
        const blocks = content.content as Array<{
          type: 'tool_result';
          toolCallId: string;
          content: string;
          isError: boolean;
        }>;
        for (const tr of blocks) {
          msgs.push({ role: 'tool', tool_call_id: tr.toolCallId, content: tr.content });
        }
      } else if (doc.meta?.response) {
        // Assistant message — pass native response message directly back to API
        const native = doc.meta.response as OpenAI.ChatCompletion;
        const msg = native.choices[0]?.message;
        if (msg) {
          msgs.push(msg as OpenAI.ChatCompletionMessageParam);
        }
      } else {
        msgs.push(this.toProviderMessage(content));
      }
    }

    return msgs;
  }

  private normalizeResponse(choice: OpenAI.ChatCompletion.Choice, responseId: string): LlmNormalizedMessage {
    const msg = choice.message;
    const content: Array<{ type: string; [key: string]: unknown }> = [];

    if (msg.content) {
      content.push({ type: 'text', text: msg.content });
    }
    if (msg.refusal) {
      content.push({ type: 'text', text: msg.refusal });
    }

    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        } catch {
          /* keep empty */
        }
        content.push({ type: 'tool_call', id: tc.id, name: tc.function.name, args });
      }
    }

    const stopReasonMap: Record<string, LlmStopReason> = {
      stop: 'end_turn',
      tool_calls: 'tool_use',
      length: 'max_tokens',
    };

    return LlmNormalizedMessageSchema.parse({
      id: responseId,
      role: 'assistant',
      content: content.length > 0 ? content : '',
      stopReason: choice.finish_reason ? stopReasonMap[choice.finish_reason] : 'end_turn',
    });
  }
}
