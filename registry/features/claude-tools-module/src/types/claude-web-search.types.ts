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
 * A block of web search hits tied to a single server tool use, returned by `ClaudeWebSearch`.
 *
 * @public
 */
export interface WebSearchResultBlock {
  tool_use_id: string;
  content: WebSearchHit[];
}

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
