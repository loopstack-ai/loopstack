export interface LoopstackClientConfig {
  /** Base URL of the Loopstack backend, e.g. `http://localhost:3000`. */
  url: string;
  /** Bearer credential (personal access token or JWT). Omit for cookie-based sessions. */
  token?: string;
  /**
   * Cache-scoping key for query descriptors. Defaults to the base URL, so two
   * clients pointing at different environments never share cache entries.
   */
  envKey?: string;
  /** Custom fetch implementation (testing, instrumentation). Defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Cookie behavior in browser environments. Defaults to `'include'`. */
  credentials?: RequestCredentials;
}

export class LoopstackApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'LoopstackApiError';
  }
}

/**
 * Query parameter values. Objects and arrays (e.g. `filter`, `sortBy`) are
 * JSON-encoded — the wire convention the API's `ZodJsonQueryPipe` expects.
 */
export type QueryParams = Record<string, string | number | boolean | object | undefined>;

export interface HttpClient {
  get<T>(path: string, query?: QueryParams): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string, body?: unknown): Promise<T>;
}

function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
  }
  return `Request failed with status ${status}`;
}

export function createHttpClient(config: LoopstackClientConfig): HttpClient {
  const fetchFn = config.fetch ?? fetch;
  const baseUrl = config.url.replace(/\/+$/, '');

  async function request<T>(
    method: string,
    path: string,
    options: { query?: QueryParams; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(baseUrl + path);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined) continue;
      url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (config.token) headers.Authorization = `Bearer ${config.token}`;

    const response = await fetchFn(url, {
      method,
      headers,
      credentials: config.credentials ?? 'include',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    const parsed: unknown = text ? safeJsonParse(text) : undefined;

    if (!response.ok) {
      throw new LoopstackApiError(response.status, parsed ?? text, extractErrorMessage(parsed, response.status));
    }

    return parsed as T;
  }

  return {
    get: (path, query) => request('GET', path, { query }),
    post: (path, body) => request('POST', path, { body }),
    put: (path, body) => request('PUT', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
    delete: (path, body) => request('DELETE', path, { body }),
  };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
