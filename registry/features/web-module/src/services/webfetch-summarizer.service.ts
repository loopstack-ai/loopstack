import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClaudeClientService } from '@loopstack/claude-module';
import { MAX_MARKDOWN_LENGTH } from '../constants';
import { isPreapprovedUrl } from '../utils/preapproved-hosts';
import { makeSecondaryModelPrompt } from '../utils/secondary-model-prompt';

export interface SummarizeOptions {
  model?: string;
  envApiKey?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

const DEFAULT_SUMMARIZER_MODEL = 'claude-haiku-4-5-20251001';

@Injectable()
export class WebFetchSummarizerService {
  private readonly logger = new Logger(WebFetchSummarizerService.name);

  @Inject() private readonly claudeClientService: ClaudeClientService;

  /**
   * Truncates the markdown to MAX_MARKDOWN_LENGTH, builds the secondary-model
   * prompt (strict vs relaxed guidelines based on the source URL), and asks
   * Claude to apply the user's prompt to the content.
   *
   * Returns `{ summary, truncated }`.
   */
  async summarize(
    url: string,
    markdown: string,
    userPrompt: string,
    options?: SummarizeOptions,
  ): Promise<{ summary: string; truncated: boolean }> {
    const truncated = markdown.length > MAX_MARKDOWN_LENGTH;
    const content = truncated
      ? markdown.slice(0, MAX_MARKDOWN_LENGTH) + '\n\n[Content truncated due to length...]'
      : markdown;

    const finalPrompt = makeSecondaryModelPrompt(content, userPrompt, isPreapprovedUrl(url));

    const client = this.claudeClientService.getClient({
      envApiKey: options?.envApiKey,
    });
    const model = options?.model ?? process.env['CLAUDE_WEB_FETCH_MODEL'] ?? DEFAULT_SUMMARIZER_MODEL;

    const message = await client.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 1024,
      messages: [{ role: 'user', content: finalPrompt }],
    });

    if (options?.signal?.aborted) {
      throw options.signal.reason ?? new Error('aborted');
    }

    const first = message.content[0];
    if (first && 'text' in first) {
      return { summary: first.text, truncated };
    }

    this.logger.warn('Summarizer returned no text block');
    return { summary: '', truncated };
  }
}
