import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { MAX_MARKDOWN_LENGTH, MAX_RESULT_SIZE_CHARS } from '../constants';
import { WebFetchFetcherService, WebFetchSummarizerService } from '../services';
import { WebFetchResult } from '../types';

export const WebFetchSchema = z
  .object({
    url: z.url().describe('The URL to fetch content from'),
    prompt: z
      .string()
      .optional()
      .describe(
        'Optional instruction applied to the fetched content by a small model. ' +
          'When omitted, the raw Markdown is returned (truncated if very long).',
      ),
    claude: z
      .object({
        model: z.string().optional(),
        envApiKey: z.string().optional(),
        maxTokens: z.number().optional(),
      })
      .optional()
      .describe('Model configuration for the summarization step. Only used when `prompt` is provided.'),
  })
  .strict();

type WebFetchArgs = z.infer<typeof WebFetchSchema>;

@Tool({
  uiConfig: {
    description:
      'Fetches content from a URL, converts HTML to Markdown, and optionally summarizes it with a small Claude model against a user-provided prompt. ' +
      'Supports HTTPS upgrade, same-origin redirect following with cross-host report, a 15-minute in-memory cache, size and redirect caps, and a preapproved-host allowlist.',
  },
  schema: WebFetchSchema,
})
export class WebFetchTool extends BaseTool {
  @Inject() private readonly fetcher: WebFetchFetcherService;
  @Inject() private readonly summarizer: WebFetchSummarizerService;

  async call(args: WebFetchArgs): Promise<ToolResult<WebFetchResult>> {
    const start = performance.now();
    const outcome = await this.fetcher.fetch(args.url);

    if (outcome.type === 'redirect') {
      const { originalUrl, redirectUrl, statusCode } = outcome.redirect;
      const message = buildRedirectMessage(originalUrl, redirectUrl, statusCode, args.prompt);

      return {
        data: {
          url: args.url,
          bytes: Buffer.byteLength(message),
          code: statusCode,
          codeText: redirectStatusText(statusCode),
          contentType: 'text/plain',
          result: message,
          truncated: false,
          cached: false,
          durationMs: performance.now() - start,
          redirect: { originalUrl, redirectUrl, statusCode },
        },
      };
    }

    const { content, cached } = outcome;

    if (content.isBinary) {
      const note = `[Binary content fetched — ${content.contentType}, ${content.bytes} bytes. No text extraction performed.]`;
      return {
        data: {
          url: args.url,
          bytes: content.bytes,
          code: content.code,
          codeText: content.codeText,
          contentType: content.contentType,
          result: note,
          truncated: false,
          cached,
          durationMs: performance.now() - start,
        },
      };
    }

    const markdown = await this.fetcher.htmlToMarkdown(content);

    let result: string;
    let truncated = false;

    if (args.prompt) {
      const summary = await this.summarizer.summarize(args.url, markdown, args.prompt, {
        model: args.claude?.model,
        envApiKey: args.claude?.envApiKey,
        maxTokens: args.claude?.maxTokens,
      });
      result = summary.summary;
      truncated = summary.truncated;
    } else {
      if (markdown.length > MAX_MARKDOWN_LENGTH) {
        result = markdown.slice(0, MAX_MARKDOWN_LENGTH) + '\n\n[Content truncated due to length...]';
        truncated = true;
      } else {
        result = markdown;
      }
    }

    result = capResultSize(result);

    return {
      data: {
        url: args.url,
        bytes: content.bytes,
        code: content.code,
        codeText: content.codeText,
        contentType: content.contentType,
        result,
        truncated,
        cached,
        durationMs: performance.now() - start,
      },
    };
  }
}

function buildRedirectMessage(
  originalUrl: string,
  redirectUrl: string,
  statusCode: number,
  prompt: string | undefined,
): string {
  const promptLine = prompt ? `- prompt: "${prompt}"\n` : '';
  return (
    `REDIRECT DETECTED: The URL redirects to a different host.\n\n` +
    `Original URL: ${originalUrl}\n` +
    `Redirect URL: ${redirectUrl}\n` +
    `Status: ${statusCode} ${redirectStatusText(statusCode)}\n\n` +
    `To complete your request, call WebFetch again with these parameters:\n` +
    `- url: "${redirectUrl}"\n` +
    promptLine
  );
}

function redirectStatusText(status: number): string {
  switch (status) {
    case 301:
      return 'Moved Permanently';
    case 302:
      return 'Found';
    case 303:
      return 'See Other';
    case 307:
      return 'Temporary Redirect';
    case 308:
      return 'Permanent Redirect';
    default:
      return 'Redirect';
  }
}

function capResultSize(text: string): string {
  if (text.length <= MAX_RESULT_SIZE_CHARS) return text;
  return text.slice(0, MAX_RESULT_SIZE_CHARS) + `\n\n[Result truncated at ${MAX_RESULT_SIZE_CHARS} characters]`;
}
