import { z } from 'zod';

export interface FetchedContent {
  content: string;
  bytes: number;
  code: number;
  codeText: string;
  contentType: string;
  isBinary: boolean;
}

export interface RedirectInfo {
  type: 'redirect';
  originalUrl: string;
  redirectUrl: string;
  statusCode: number;
}

/**
 * Result for `WebFetchTool` — the fetched URL, response metadata, the Markdown or summarized content, and optional redirect details.
 *
 * @public
 */
export interface WebFetchResult {
  url: string;
  bytes: number;
  code: number;
  codeText: string;
  contentType: string;
  result: string;
  truncated: boolean;
  cached: boolean;
  durationMs: number;
  redirect?: {
    originalUrl: string;
    redirectUrl: string;
    statusCode: number;
  };
}

/**
 * Zod schema for {@link WebFetchResult}.
 *
 * @public
 */
export const WebFetchResultSchema = z.strictObject({
  url: z.string(),
  bytes: z.number(),
  code: z.number(),
  codeText: z.string(),
  contentType: z.string(),
  result: z.string(),
  truncated: z.boolean(),
  cached: z.boolean(),
  durationMs: z.number(),
  redirect: z
    .strictObject({
      originalUrl: z.string(),
      redirectUrl: z.string(),
      statusCode: z.number(),
    })
    .optional(),
});
