import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_AGENT, FETCH_TIMEOUT_MS, MAX_HTTP_CONTENT_LENGTH, MAX_REDIRECTS } from '../../constants.js';
import type { FetchedContent } from '../../types/index.js';
import {
  ContentTooLargeError,
  EgressBlockedError,
  FetchTimeoutError,
  InvalidUrlError,
  RedirectLimitExceededError,
} from '../../utils/errors.js';
import { WebFetchFetcherService } from '../webfetch-fetcher.service.js';
import { WebFetchMarkdownService } from '../webfetch-markdown.service.js';

describe('WebFetchFetcherService', () => {
  let module: TestingModule;
  let service: WebFetchFetcherService;

  const mockMarkdown = { toMarkdown: vi.fn() };
  const fetchMock = vi.fn();

  const html = (body: string, init?: ResponseInit) =>
    new Response(body, { status: 200, statusText: 'OK', headers: { 'content-type': 'text/html' }, ...init });
  const redirect = (location: string, status = 301) => new Response(null, { status, headers: { location } });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);

    module = await Test.createTestingModule({
      providers: [WebFetchFetcherService, { provide: WebFetchMarkdownService, useValue: mockMarkdown }],
    }).compile();

    service = module.get(WebFetchFetcherService);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('fetch', () => {
    it('fetches the URL and returns its content', async () => {
      fetchMock.mockResolvedValue(html('<p>Hello</p>'));

      const outcome = await service.fetch('https://example.com/page');

      expect(fetchMock).toHaveBeenCalledWith('https://example.com/page', {
        method: 'GET',
        redirect: 'manual',
        signal: expect.any(AbortSignal) as AbortSignal,
        headers: { Accept: 'text/markdown, text/html, */*', 'User-Agent': DEFAULT_USER_AGENT },
      });
      expect(outcome).toEqual({
        type: 'content',
        cached: false,
        content: {
          content: '<p>Hello</p>',
          bytes: 12,
          code: 200,
          codeText: 'OK',
          contentType: 'text/html',
          isBinary: false,
        },
      });
    });

    it('upgrades http URLs to https', async () => {
      fetchMock.mockResolvedValue(html('ok'));

      await service.fetch('http://example.com/page?q=1');

      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/page?q=1');
    });

    it.each(['ftp://example.com/file', 'https://user:pass@example.com/', 'not a url'])(
      'rejects the invalid URL %s without fetching',
      async (url) => {
        await expect(service.fetch(url)).rejects.toBeInstanceOf(InvalidUrlError);
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it('follows a same-host redirect', async () => {
      fetchMock.mockResolvedValueOnce(redirect('/new')).mockResolvedValueOnce(html('moved'));

      const outcome = await service.fetch('https://example.com/old');

      expect(fetchMock.mock.calls.map((call) => call[0] as string)).toEqual([
        'https://example.com/old',
        'https://example.com/new',
      ]);
      expect(outcome).toMatchObject({ type: 'content', content: { content: 'moved' } });
    });

    it('follows a redirect that only adds the www prefix', async () => {
      fetchMock.mockResolvedValueOnce(redirect('https://www.example.com/', 308)).mockResolvedValueOnce(html('home'));

      const outcome = await service.fetch('https://example.com/');

      expect(fetchMock.mock.calls[1][0]).toBe('https://www.example.com/');
      expect(outcome).toMatchObject({ type: 'content', content: { content: 'home' } });
    });

    it('surfaces a cross-host redirect without following it', async () => {
      fetchMock.mockResolvedValue(redirect('https://other.example.org/target', 302));

      const outcome = await service.fetch('https://example.com/start');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(outcome).toEqual({
        type: 'redirect',
        redirect: {
          type: 'redirect',
          originalUrl: 'https://example.com/start',
          redirectUrl: 'https://other.example.org/target',
          statusCode: 302,
        },
      });
    });

    it('surfaces a redirect that downgrades to http', async () => {
      fetchMock.mockResolvedValue(redirect('http://example.com/plain'));

      const outcome = await service.fetch('https://example.com/');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(outcome).toMatchObject({ type: 'redirect', redirect: { redirectUrl: 'http://example.com/plain' } });
    });

    it('does not cache redirect outcomes', async () => {
      fetchMock.mockImplementation(() => Promise.resolve(redirect('https://other.example.org/')));

      await service.fetch('https://example.com/');
      await service.fetch('https://example.com/');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws once the redirect limit is exceeded', async () => {
      let hop = 0;
      fetchMock.mockImplementation(() => Promise.resolve(redirect(`/hop-${++hop}`, 302)));

      await expect(service.fetch('https://example.com/')).rejects.toBeInstanceOf(RedirectLimitExceededError);
      expect(fetchMock).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
    });

    it('throws when a redirect has no Location header', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 302 }));

      await expect(service.fetch('https://example.com/')).rejects.toThrow('Redirect (302) missing Location header');
    });

    it('throws EgressBlockedError when the egress proxy blocks the host', async () => {
      fetchMock.mockResolvedValue(
        new Response('blocked', { status: 403, headers: { 'x-proxy-error': 'blocked-by-allowlist' } }),
      );

      const error = (await service.fetch('https://example.com/').catch((e: unknown) => e)) as EgressBlockedError;

      expect(error).toBeInstanceOf(EgressBlockedError);
      expect(error.domain).toBe('example.com');
    });

    it('returns a plain 403 as content', async () => {
      fetchMock.mockResolvedValue(new Response('forbidden', { status: 403, statusText: 'Forbidden' }));

      const outcome = await service.fetch('https://example.com/');

      expect(outcome).toMatchObject({
        type: 'content',
        content: { code: 403, codeText: 'Forbidden', content: 'forbidden' },
      });
    });

    it('marks binary content and drops its text', async () => {
      fetchMock.mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'application/pdf' } }),
      );

      const outcome = await service.fetch('https://example.com/file.pdf');

      expect(outcome).toMatchObject({
        type: 'content',
        content: { content: '', bytes: 4, contentType: 'application/pdf', isBinary: true },
      });
    });

    it('defaults a missing content type to an empty string', async () => {
      fetchMock.mockResolvedValue(new Response(new Uint8Array([104, 105]), { status: 200 }));

      const outcome = await service.fetch('https://example.com/');

      expect(outcome).toMatchObject({ type: 'content', content: { content: 'hi', contentType: '', isBinary: false } });
    });

    it('rejects a declared content length above the limit', async () => {
      fetchMock.mockResolvedValue(
        new Response('small', { status: 200, headers: { 'content-length': String(MAX_HTTP_CONTENT_LENGTH + 1) } }),
      );

      await expect(service.fetch('https://example.com/')).rejects.toBeInstanceOf(ContentTooLargeError);
    });

    it('aborts a streamed body that grows beyond the limit', async () => {
      const chunk = new Uint8Array(1024 * 1024);
      let sent = 0;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          sent += chunk.byteLength;
          controller.enqueue(chunk);
          if (sent > MAX_HTTP_CONTENT_LENGTH * 2) controller.close();
        },
      });
      fetchMock.mockResolvedValue(new Response(body, { status: 200 }));

      await expect(service.fetch('https://example.com/')).rejects.toBeInstanceOf(ContentTooLargeError);
      expect(sent).toBeLessThanOrEqual(MAX_HTTP_CONTENT_LENGTH + 2 * chunk.byteLength);
    });

    it('turns an internal timeout abort into FetchTimeoutError', async () => {
      const reason = new DOMException('The operation timed out.', 'TimeoutError');
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort(reason));
      fetchMock.mockRejectedValue(reason);

      const error = await service.fetch('https://example.com/').catch((e: unknown) => e);

      expect(timeoutSpy).toHaveBeenCalledWith(FETCH_TIMEOUT_MS);
      expect(error).toBeInstanceOf(FetchTimeoutError);
    });

    it('surfaces the caller abort unchanged', async () => {
      const controller = new AbortController();
      controller.abort();
      const abortError = new DOMException('This operation was aborted', 'AbortError');
      fetchMock.mockRejectedValue(abortError);

      await expect(service.fetch('https://example.com/', controller.signal)).rejects.toBe(abortError);
      expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
    });

    it('rethrows network errors unchanged', async () => {
      const networkError = new TypeError('fetch failed');
      fetchMock.mockRejectedValue(networkError);

      await expect(service.fetch('https://example.com/')).rejects.toBe(networkError);
    });

    it('serves the second request for the same URL from the cache', async () => {
      fetchMock.mockResolvedValue(html('<p>cached</p>'));

      const first = await service.fetch('http://example.com/doc');
      const second = await service.fetch('http://example.com/doc');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(first).toMatchObject({ cached: false });
      expect(second).toEqual({ ...first, cached: true });
    });

    it('caches per URL', async () => {
      fetchMock.mockImplementation(() => Promise.resolve(html('page')));

      await service.fetch('https://example.com/a');
      await service.fetch('https://example.com/b');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('fetches again after the cache is cleared', async () => {
      fetchMock.mockImplementation(() => Promise.resolve(html('page')));

      await service.fetch('https://example.com/');
      service.clearCache();
      const outcome = await service.fetch('https://example.com/');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(outcome).toMatchObject({ cached: false });
    });

    it('returns copies so callers cannot mutate the cache', async () => {
      fetchMock.mockResolvedValue(html('original'));

      const first = await service.fetch('https://example.com/');
      if (first.type === 'content') first.content.content = 'mutated';
      const second = await service.fetch('https://example.com/');

      expect(second).toMatchObject({ cached: true, content: { content: 'original' } });
    });

    it('fetches preapproved hosts through the same pipeline', async () => {
      fetchMock.mockResolvedValue(html('docs'));

      const outcome = await service.fetch('http://nodejs.org/api/fs.html');

      expect(fetchMock.mock.calls[0][0]).toBe('https://nodejs.org/api/fs.html');
      expect(outcome).toMatchObject({ type: 'content', cached: false, content: { content: 'docs' } });
    });
  });

  describe('htmlToMarkdown', () => {
    const content = (overrides: Partial<FetchedContent>): FetchedContent => ({
      content: '<h1>Hi</h1>',
      bytes: 11,
      code: 200,
      codeText: 'OK',
      contentType: 'text/html; charset=utf-8',
      isBinary: false,
      ...overrides,
    });

    it('converts HTML through the markdown service', async () => {
      mockMarkdown.toMarkdown.mockResolvedValue('# Hi');

      expect(await service.htmlToMarkdown(content({ contentType: 'Text/HTML' }))).toBe('# Hi');
      expect(mockMarkdown.toMarkdown).toHaveBeenCalledWith('<h1>Hi</h1>');
    });

    it('returns non-HTML text unchanged', async () => {
      expect(await service.htmlToMarkdown(content({ content: '# Already', contentType: 'text/markdown' }))).toBe(
        '# Already',
      );
      expect(mockMarkdown.toMarkdown).not.toHaveBeenCalled();
    });

    it('returns an empty string for binary content', async () => {
      expect(await service.htmlToMarkdown(content({ isBinary: true, contentType: 'image/png' }))).toBe('');
      expect(mockMarkdown.toMarkdown).not.toHaveBeenCalled();
    });
  });
});
