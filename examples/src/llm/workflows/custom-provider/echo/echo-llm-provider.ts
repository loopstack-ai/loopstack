import { Injectable, OnModuleInit } from '@nestjs/common';
import type { DocumentEntity } from '@loopstack/common';
import type {
  LlmContext,
  LlmGenerateObjectResult,
  LlmGenerateTextArgs,
  LlmGenerateTextResult,
  LlmNormalizedMessage,
  LlmProviderInterface,
  LlmUsage,
} from '@loopstack/llm-provider';
import { LlmProviderRegistry } from '@loopstack/llm-provider';
import { EchoClient } from './echo-client';
import type { EchoMessage, EchoResponse } from './echo-client';

/**
 * A minimal LLM provider: it implements `LlmProviderInterface` against the echo API and registers
 * itself with `LlmProviderRegistry`, so `llm_generate_text` reaches it with `config.provider: 'echo'`.
 */
@Injectable()
export class EchoLlmProvider implements LlmProviderInterface, OnModuleInit {
  readonly providerId = 'echo';

  constructor(
    private readonly registry: LlmProviderRegistry,
    private readonly client: EchoClient,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async generateText(args: LlmGenerateTextArgs, ctx: LlmContext): Promise<LlmGenerateTextResult> {
    if (args.tools?.length) {
      throw new Error(`The echo provider cannot call tools: ${args.tools.map((tool) => tool.name).join(', ')}`);
    }

    const response = await this.client.complete({
      model: args.model ?? 'echo-1',
      messages: this.resolveMessages(args, ctx.documents),
    });

    // The echo API answers in one piece, so the provider streams the reply word by word.
    // `llm_generate_text` sends the `start` and `done` events itself.
    if (args.onStream && args.streamMessageId) {
      for (const delta of response.content.split(/(?<= )/)) {
        await args.onStream({ type: 'text_delta', messageId: args.streamMessageId, delta });
      }
    }

    return {
      message: this.normalizeResponse(response),
      response, // `llm_generate_text` saves it as `meta.response`, for `resolveMessages` to replay
    };
  }

  async generateObject(): Promise<LlmGenerateObjectResult> {
    throw new Error('The echo provider cannot generate structured output.');
  }

  extractUsage(response: unknown): LlmUsage | undefined {
    const usage = (response as EchoResponse | undefined)?.usage;
    if (!usage) return undefined;
    return { inputTokens: usage.inputWords, outputTokens: usage.outputWords };
  }

  /** Converts a message this provider did not write. Blocks the echo API cannot express are left out. */
  toProviderMessage(message: LlmNormalizedMessage): EchoMessage {
    const content = message.blocks?.length
      ? message.blocks.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n')
      : message.text;
    return { role: message.role, content };
  }

  private resolveMessages(args: LlmGenerateTextArgs, documents: DocumentEntity[]): EchoMessage[] {
    if (args.prompt) {
      return [{ role: 'user', content: args.prompt }];
    }

    if (args.messages?.length) {
      return args.messages.map((m) => this.toProviderMessage({ role: m.role, text: m.text ?? '', blocks: m.blocks }));
    }

    const tag = args.messagesSearchTag ?? 'message';
    return documents
      .filter((doc) => !doc.isInvalidated && doc.tags?.includes(tag))
      .sort((a, b) => a.index - b.index)
      .map((doc) => {
        // Only a response this provider wrote is in the echo format; any other message is converted
        const ownResponse = doc.meta?.provider === this.providerId ? (doc.meta.response as EchoResponse) : undefined;
        return ownResponse
          ? { role: ownResponse.role, content: ownResponse.content }
          : this.toProviderMessage(doc.content as LlmNormalizedMessage);
      });
  }

  private normalizeResponse(response: EchoResponse): LlmNormalizedMessage {
    return {
      id: response.id,
      role: 'assistant',
      text: response.content,
      blocks: [{ type: 'text', text: response.content }],
      stopReason: 'end_turn',
    };
  }
}
