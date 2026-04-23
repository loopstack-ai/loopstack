import { Inject, Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import {
  CACHE_TTL_MS,
  DEFAULT_USER_AGENT,
  FETCH_TIMEOUT_MS,
  MAX_CACHE_SIZE_BYTES,
  MAX_HTTP_CONTENT_LENGTH,
  MAX_REDIRECTS,
} from '../constants';
import { FetchedContent, RedirectInfo } from '../types';
import {
  ContentTooLargeError,
  EgressBlockedError,
  FetchTimeoutError,
  InvalidUrlError,
  RedirectLimitExceededError,
} from '../utils/errors';
import { isBinaryContentType, isPermittedRedirect, validateURL } from '../utils/url.utils';
import { WebFetchMarkdownService } from './webfetch-markdown.service';

type CacheEntry = FetchedContent;

export type FetchOutcome =
  | { type: 'content'; content: FetchedContent; cached: boolean }
  | { type: 'redirect'; redirect: RedirectInfo };

@Injectable()
export class WebFetchFetcherService {
  @Inject() private readonly markdownService: WebFetchMarkdownService;

  private readonly urlCache = new LRUCache<string, CacheEntry>({
    maxSize: MAX_CACHE_SIZE_BYTES,
    ttl: CACHE_TTL_MS,
    sizeCalculation: (entry) => Math.max(1, Buffer.byteLength(entry.content, 'utf-8')),
  });

  clearCache(): void {
    this.urlCache.clear();
  }

  async fetch(url: string, callerSignal?: AbortSignal): Promise<FetchOutcome> {
    const validation = validateURL(url);
    if (!validation.ok) {
      throw new InvalidUrlError(url, validation.reason);
    }

    // Cache under the original user-supplied URL so identical requests hit
    // even when we internally upgrade http → https.
    const cached = this.urlCache.get(url);
    if (cached) {
      return { type: 'content', content: { ...cached }, cached: true };
    }

    const upgradedUrl = upgradeToHttps(validation.parsed);
    const response = await this.fetchWithPermittedRedirects(upgradedUrl, callerSignal);

    if ('type' in response && response.type === 'redirect') {
      return { type: 'redirect', redirect: response };
    }

    const content = await this.toFetchedContent(response);
    this.urlCache.set(url, { ...content });
    return { type: 'content', content, cached: false };
  }

  async htmlToMarkdown(content: FetchedContent): Promise<string> {
    if (content.isBinary) return '';
    if (content.contentType.toLowerCase().includes('text/html')) {
      return this.markdownService.toMarkdown(content.content);
    }
    return content.content;
  }

  private async fetchWithPermittedRedirects(
    url: string,
    callerSignal: AbortSignal | undefined,
    depth = 0,
  ): Promise<Response | RedirectInfo> {
    if (depth > MAX_REDIRECTS) {
      throw new RedirectLimitExceededError(MAX_REDIRECTS);
    }

    const composed = composeSignal(callerSignal);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: composed,
        headers: {
          Accept: 'text/markdown, text/html, */*',
          'User-Agent': DEFAULT_USER_AGENT,
        },
      });
    } catch (error) {
      throw this.reclassifyFetchError(error, composed, callerSignal);
    }

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect (${response.status}) missing Location header`);
      }

      const redirectUrl = new URL(location, url).toString();

      if (isPermittedRedirect(url, redirectUrl)) {
        // Same-origin redirect — follow it without user interaction. Drain
        // the body of the 3xx response so the socket can be reused.
        await drain(response);
        return this.fetchWithPermittedRedirects(redirectUrl, callerSignal, depth + 1);
      }

      await drain(response);
      return {
        type: 'redirect',
        originalUrl: url,
        redirectUrl,
        statusCode: response.status,
      };
    }

    if (response.status === 403 && response.headers.get('x-proxy-error') === 'blocked-by-allowlist') {
      await drain(response);
      throw new EgressBlockedError(new URL(url).hostname);
    }

    return response;
  }

  private async toFetchedContent(response: Response): Promise<FetchedContent> {
    const contentType = response.headers.get('content-type') ?? '';

    const declaredLength = parseInt(response.headers.get('content-length') ?? '', 10);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_HTTP_CONTENT_LENGTH) {
      await drain(response);
      throw new ContentTooLargeError(MAX_HTTP_CONTENT_LENGTH);
    }

    const buffer = await readBodyWithCap(response, MAX_HTTP_CONTENT_LENGTH);
    const isBinary = isBinaryContentType(contentType);

    return {
      content: isBinary ? '' : buffer.toString('utf-8'),
      bytes: buffer.length,
      code: response.status,
      codeText: response.statusText,
      contentType,
      isBinary,
    };
  }

  private reclassifyFetchError(error: unknown, composed: AbortSignal, callerSignal?: AbortSignal): unknown {
    if (!(error instanceof Error)) return error;

    const isAbort = error.name === 'AbortError' || error.name === 'TimeoutError';
    if (!isAbort) return error;

    // Caller's own abort wins — surface it unchanged.
    if (callerSignal?.aborted) return error;

    if (composed.aborted) {
      return new FetchTimeoutError(FETCH_TIMEOUT_MS);
    }

    return error;
  }
}

function upgradeToHttps(parsed: URL): string {
  if (parsed.protocol === 'http:') {
    const copy = new URL(parsed.toString());
    copy.protocol = 'https:';
    return copy.toString();
  }
  return parsed.toString();
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function composeSignal(callerSignal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  if (!callerSignal) return timeout;

  const controller = new AbortController();
  const abortFrom = (source: AbortSignal): void => {
    if (!controller.signal.aborted) controller.abort(source.reason);
  };

  if (callerSignal.aborted) {
    abortFrom(callerSignal);
  } else {
    callerSignal.addEventListener('abort', () => abortFrom(callerSignal), { once: true });
  }

  if (timeout.aborted) {
    abortFrom(timeout);
  } else {
    timeout.addEventListener('abort', () => abortFrom(timeout), { once: true });
  }

  return controller.signal;
}

async function drain(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    /* ignore */
  }
}

async function readBodyWithCap(response: Response, cap: number): Promise<Buffer> {
  if (!response.body) {
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length > cap) throw new ContentTooLargeError(cap);
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > cap) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        throw new ContentTooLargeError(cap);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }

  return Buffer.concat(chunks, total);
}
