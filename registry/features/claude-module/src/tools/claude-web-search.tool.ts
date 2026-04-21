import Anthropic from '@anthropic-ai/sdk';
import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { ClaudeClientService } from '../services';
import { WebSearchHit, WebSearchResult, WebSearchResultBlock } from '../types';

const MAX_RESULT_SIZE_CHARS = 20_000;
const DEFAULT_MAX_USES = 8;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MODEL = 'claude-sonnet-4-6';

const SOURCES_REMINDER =
  'REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.';

export const ClaudeWebSearchSchema = z
  .object({
    query: z.string().min(2).describe('The search query to execute'),
    allowed_domains: z.array(z.string()).optional().describe('Only include search results from these domains'),
    blocked_domains: z.array(z.string()).optional().describe('Never include search results from these domains'),
    max_uses: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Maximum number of searches the model may perform (default: 8)'),
    timeoutMs: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Hard timeout for the API call in milliseconds (default: 120000)'),
    claude: z
      .object({
        model: z.string().optional(),
        envApiKey: z.string().optional(),
        maxTokens: z.number().optional(),
      })
      .optional(),
  })
  .strict()
  .refine((v) => !(v.allowed_domains?.length && v.blocked_domains?.length), {
    message: 'Cannot specify both allowed_domains and blocked_domains in the same request',
  });

type ClaudeWebSearchArgs = z.infer<typeof ClaudeWebSearchSchema>;

@Tool({
  uiConfig: {
    description:
      'Search the web using the Anthropic Claude API built-in web_search server tool. ' +
      'Returns a list of search hits (title + URL) and any text commentary from the model. ' +
      "Use this to retrieve current information beyond the model's knowledge cutoff.",
  },
  schema: ClaudeWebSearchSchema,
})
export class ClaudeWebSearch extends BaseTool {
  private readonly logger = new Logger(ClaudeWebSearch.name);

  @Inject() private readonly claudeClientService: ClaudeClientService;

  async call(args: ClaudeWebSearchArgs): Promise<ToolResult<WebSearchResult>> {
    const client = this.claudeClientService.getClient(args.claude);
    const model = this.claudeClientService.getModel(args.claude, DEFAULT_MODEL);

    const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = performance.now();
    try {
      const webSearchTool = this.buildWebSearchTool(args);

      const stream = client.messages.stream(
        {
          model,
          max_tokens: args.claude?.maxTokens ?? DEFAULT_MAX_TOKENS,
          system: this.getSystemPrompt(),
          messages: [{ role: 'user', content: `Perform a web search for the query: ${args.query}` }],
          tools: [webSearchTool],
        },
        { signal: controller.signal, timeout: timeoutMs },
      );

      const response = await stream.finalMessage();
      const durationSeconds = (performance.now() - startTime) / 1000;

      const data = this.capResultSize(this.parseResponse(response.content, args.query, durationSeconds));

      return {
        data,
        metadata: {
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
            cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
          },
        },
      };
    } catch (error) {
      const elapsedMs = performance.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Web search failed after ${elapsedMs.toFixed(0)}ms: ${message}`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private buildWebSearchTool(args: ClaudeWebSearchArgs): Anthropic.WebSearchTool20260209 {
    return {
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: args.max_uses ?? DEFAULT_MAX_USES,
      ...(args.allowed_domains?.length ? { allowed_domains: args.allowed_domains } : {}),
      ...(args.blocked_domains?.length ? { blocked_domains: args.blocked_domains } : {}),
    };
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
