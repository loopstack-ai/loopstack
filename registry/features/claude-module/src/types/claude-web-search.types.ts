export interface WebSearchHit {
  title: string;
  url: string;
}

export interface WebSearchResultBlock {
  tool_use_id: string;
  content: WebSearchHit[];
}

export interface WebSearchResult {
  query: string;
  results: Array<WebSearchResultBlock | string>;
  sourcesReminder: string;
  durationSeconds: number;
}
