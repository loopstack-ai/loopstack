import Anthropic from '@anthropic-ai/sdk';
import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool } from '@loopstack/llm-provider-module';
import { WebSearchHit, WebSearchResult, WebSearchResultBlock } from '../types/index.js';

const MAX_RESULT_SIZE_CHARS = 20_000;

const SOURCES_REMINDER =
  'REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.';

export const ClaudeWebSearchArgsSchema = z
  .object({
    query: z.string().min(2).describe('The search query to execute'),
  })
  .strict();

export const ClaudeWebSearchConfigSchema = z.object({
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  envApiKey: z.string().optional(),
  cache: z.boolean().optional(),
});

type ClaudeWebSearchArgs = z.infer<typeof ClaudeWebSearchArgsSchema>;
type ClaudeWebSearchConfig = z.infer<typeof ClaudeWebSearchConfigSchema>;

@Tool({
  name: 'claude_web_search',
  description:
    'Search the web using the Anthropic Claude API built-in web_search server tool. ' +
    'Returns a list of search hits (title + URL) and any text commentary from the model. ' +
    "Use this to retrieve current information beyond the model's knowledge cutoff.",
  schema: ClaudeWebSearchArgsSchema,
  configSchema: ClaudeWebSearchConfigSchema,
})
export class ClaudeWebSearch extends BaseTool<ClaudeWebSearchArgs, ClaudeWebSearchConfig, WebSearchResult> {
  private readonly logger = new Logger(ClaudeWebSearch.name);

  @Inject() private readonly llmGenerateText: LlmGenerateTextTool;

  protected async handle(
    args: ClaudeWebSearchArgs,
    ctx: RunContext,
    options?: ToolCallOptions<ClaudeWebSearchConfig>,
  ): Promise<ToolEnvelope<WebSearchResult>> {
    const config = options?.config;
    const startTime = performance.now();

    const result = await this.llmGenerateText.call(
      { prompt: `Perform a web search for the query: ${args.query}` },
      {
        config: {
          system: this.getSystemPrompt(),
          model: config?.model,
          tools: ['claude_web_search_server'],
          providerConfig: {
            ...(config?.maxTokens != null ? { maxTokens: config.maxTokens } : {}),
            ...(config?.envApiKey ? { envApiKey: config.envApiKey } : {}),
            ...(config?.cache != null ? { cache: config.cache } : {}),
          },
        },
      },
    );

    const response = result.data.response as Anthropic.Message;
    const durationSeconds = (performance.now() - startTime) / 1000;
    const data = this.capResultSize(this.parseResponse(response.content, args.query, durationSeconds));

    return { data, metadata: result.metadata };
  }

  private getSystemPrompt(): string {
    const monthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return [
      "You are an assistant that performs a web search for the user's query and returns the relevant results.",
      `The current month is ${monthYear}. Use this year in queries when searching for recent information,`,
      'documentation, or current events — never default to a prior year.',
    ].join(' ');
  }

  private parseResponse(blocks: Anthropic.ContentBlock[], query: string, durationSeconds: number): WebSearchResult {
    const results: Array<WebSearchResultBlock | string> = [];
    let textAcc = '';
    let inText = true;

    for (const block of blocks ?? []) {
      if (block == null) continue;

      if (block.type === 'server_tool_use') {
        if (inText) {
          inText = false;
          if (textAcc.trim().length > 0) results.push(textAcc.trim());
          textAcc = '';
        }
        continue;
      }

      if (block.type === 'web_search_tool_result') {
        if (!Array.isArray(block.content)) {
          const errorMessage = `Web search error: ${block.content.error_code}`;
          this.logger.error(errorMessage);
          results.push(errorMessage);
          continue;
        }
        const hits: WebSearchHit[] = block.content
          .filter((r): r is Anthropic.WebSearchResultBlock => r != null)
          .map((r) => ({ title: r.title, url: r.url }));
        results.push({ tool_use_id: block.tool_use_id, content: hits });
        continue;
      }

      if (block.type === 'text') {
        if (inText) {
          textAcc += block.text;
        } else {
          inText = true;
          textAcc = block.text;
        }
      }
    }

    if (textAcc.length) results.push(textAcc.trim());

    return { query, results, sourcesReminder: SOURCES_REMINDER, durationSeconds };
  }

  private capResultSize(data: WebSearchResult): WebSearchResult {
    const capped: Array<WebSearchResultBlock | string> = [];
    let runningSize = 0;
    let truncated = false;

    for (const entry of data.results) {
      const entrySize = JSON.stringify(entry).length;
      if (runningSize + entrySize > MAX_RESULT_SIZE_CHARS) {
        truncated = true;
        break;
      }
      capped.push(entry);
      runningSize += entrySize;
    }

    if (!truncated) return data;

    this.logger.warn(
      `Web search result exceeds ${MAX_RESULT_SIZE_CHARS} chars; truncated to ${capped.length} entries.`,
    );
    capped.push(`(results truncated at ${MAX_RESULT_SIZE_CHARS} characters)`);
    return { ...data, results: capped };
  }
}
