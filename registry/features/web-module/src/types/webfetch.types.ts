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
