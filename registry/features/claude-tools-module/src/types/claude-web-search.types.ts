import { z } from 'zod';

/**
 * A single web search hit (title + URL) returned by `ClaudeWebSearch`.
 *
 * @public
 */
export interface WebSearchHit {
  title: string;
  url: string;
}

/**
 * Zod schema for {@link WebSearchHit}.
 *
 * @public
 */
export const WebSearchHitSchema = z.strictObject({
  title: z.string(),
  url: z.string(),
});

/**
 * A block of web search hits tied to a single server tool use, returned by `ClaudeWebSearch`.
 *
 * @public
 */
export interface WebSearchResultBlock {
  tool_use_id: string;
  content: WebSearchHit[];
}

/**
 * Zod schema for {@link WebSearchResultBlock}.
 *
 * @public
 */
export const WebSearchResultBlockSchema = z.strictObject({
  tool_use_id: z.string(),
  content: z.array(WebSearchHitSchema),
});

/**
 * Result for `ClaudeWebSearch` — the query, interleaved hit blocks and text commentary, a sources reminder, and timing.
 *
 * @public
 */
export interface WebSearchResult {
  query: string;
  results: Array<WebSearchResultBlock | string>;
  sourcesReminder: string;
  durationSeconds: number;
}

/**
 * Zod schema for {@link WebSearchResult} — the `resultSchema` of `claude_web_search`.
 *
 * @public
 */
export const WebSearchResultSchema = z.strictObject({
  query: z.string(),
  results: z.array(z.union([WebSearchResultBlockSchema, z.string()])),
  sourcesReminder: z.string(),
  durationSeconds: z.number(),
});
