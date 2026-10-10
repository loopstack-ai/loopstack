import { Inject, Injectable } from '@nestjs/common';
import { LLM_MODULE_CONFIG, LlmProviderRegistry } from '@loopstack/llm-provider';
import type { LlmModuleConfig, LlmResultMeta } from '@loopstack/llm-provider';
import { MAX_MARKDOWN_LENGTH } from '../constants.js';
import { isPreapprovedUrl } from '../utils/preapproved-hosts.js';
import { makeSecondaryModelPrompt } from '../utils/secondary-model-prompt.js';

export interface SummarizeOptions {
  provider?: string;
  model?: string;
  envApiKey?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface SummarizeResult {
  summary: string;
  truncated: boolean;
  meta: LlmResultMeta;
}

const DEFAULT_SUMMARIZER_MODEL = 'claude-haiku-4-5-20251001';

@Injectable()
export class WebFetchSummarizerService {
  @Inject() private readonly registry: LlmProviderRegistry;
  @Inject(LLM_MODULE_CONFIG) private readonly moduleConfig: LlmModuleConfig;

  /**
   * Truncates the markdown to MAX_MARKDOWN_LENGTH, builds the secondary-model
   * prompt (strict vs relaxed guidelines based on the source URL), and asks
   * the configured LLM provider to apply the user's prompt to the content.
   *
   * The provider is `options.provider`, else the `LlmProviderModule` default, else `claude`.
   * The model is `options.model`, else `CLAUDE_WEB_FETCH_MODEL`, else `claude-haiku-4-5-20251001`.
   *
   * Returns `{ summary, truncated, meta }` — `meta` carries the provider, model and token usage.
   */
  async summarize(
    url: string,
    markdown: string,
    userPrompt: string,
    options?: SummarizeOptions,
  ): Promise<SummarizeResult> {
    const truncated = markdown.length > MAX_MARKDOWN_LENGTH;
    const content = truncated
      ? markdown.slice(0, MAX_MARKDOWN_LENGTH) + '\n\n[Content truncated due to length...]'
      : markdown;

    const finalPrompt = makeSecondaryModelPrompt(content, userPrompt, isPreapprovedUrl(url));

    const provider = this.registry.get(options?.provider ?? this.moduleConfig.provider ?? 'claude');
    const model = options?.model ?? process.env['CLAUDE_WEB_FETCH_MODEL'] ?? DEFAULT_SUMMARIZER_MODEL;

    const result = await provider.generateText(
      {
        prompt: finalPrompt,
        model,
        providerConfig: { envApiKey: options?.envApiKey, maxTokens: options?.maxTokens ?? 1024 },
      },
      { documents: [], signal: options?.signal },
    );

    const usage = provider.extractUsage(result.response);

    return {
      summary: result.message.text,
      truncated,
      meta: {
        provider: provider.providerId,
        model,
        ...(usage && { usage }),
      },
    };
  }
}
