import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockArgsSchema } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { MAX_MARKDOWN_LENGTH, MAX_RESULT_SIZE_CHARS } from '../../constants.js';
import { WebFetchFetcherService, WebFetchSummarizerService } from '../../services/index.js';
import type { FetchOutcome } from '../../services/index.js';
import { type FetchedContent, WebFetchResultSchema } from '../../types/index.js';
import { InvalidUrlError } from '../../utils/errors.js';
import { WebFetchTool } from '../web-fetch.tool.js';

describe('WebFetchTool', () => {
  let module: TestingModule;
  let tool: WebFetchTool;

  const mockFetcher = { fetch: vi.fn(), htmlToMarkdown: vi.fn() };
  const mockSummarizer = { summarize: vi.fn() };

  const htmlContent: FetchedContent = {
    content: '<h1>Hello</h1>',
    bytes: 14,
    code: 200,
    codeText: 'OK',
    contentType: 'text/html',
    isBinary: false,
  };
  const contentOutcome = (content: FetchedContent, cached = false): FetchOutcome => ({
    type: 'content',
    content,
    cached,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createToolTest()
      .forTool(WebFetchTool)
      .withMock(WebFetchFetcherService, mockFetcher)
      .withMock(WebFetchSummarizerService, mockSummarizer)
      .compile();

    tool = module.get(WebFetchTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires a valid url', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ url: 'not a url' })).toThrow();
      expect(() => schema.parse({ url: 'https://example.com' })).not.toThrow();
    });

    it('accepts the optional summarization args', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() =>
        schema.parse({ url: 'https://example.com', prompt: 'p', model: 'm', envApiKey: 'K', maxTokens: 100 }),
      ).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ url: 'https://example.com', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('returns the converted markdown without a prompt', async () => {
      mockFetcher.fetch.mockResolvedValue(contentOutcome(htmlContent));
      mockFetcher.htmlToMarkdown.mockResolvedValue('# Hello');

      const result = await tool.call({ url: 'https://example.com/' });

      expect(mockFetcher.fetch).toHaveBeenCalledWith('https://example.com/');
      expect(mockFetcher.htmlToMarkdown).toHaveBeenCalledWith(htmlContent);
      expect(mockSummarizer.summarize).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        url: 'https://example.com/',
        bytes: 14,
        code: 200,
        codeText: 'OK',
        contentType: 'text/html',
        result: '# Hello',
        truncated: false,
        cached: false,
        durationMs: expect.any(Number) as number,
      });
      expect(() => WebFetchResultSchema.parse(result.data)).not.toThrow();
    });

    it('reports cache hits', async () => {
      mockFetcher.fetch.mockResolvedValue(contentOutcome(htmlContent, true));
      mockFetcher.htmlToMarkdown.mockResolvedValue('# Hello');

      const result = await tool.call({ url: 'https://example.com/' });

      expect(result.data!.cached).toBe(true);
    });

    it('truncates long markdown without a prompt', async () => {
      mockFetcher.fetch.mockResolvedValue(contentOutcome(htmlContent));
      mockFetcher.htmlToMarkdown.mockResolvedValue('a'.repeat(MAX_MARKDOWN_LENGTH) + 'OVERFLOW');

      const result = await tool.call({ url: 'https://example.com/' });

      expect(result.data!.truncated).toBe(true);
      expect(result.data!.result.startsWith('a'.repeat(MAX_MARKDOWN_LENGTH))).toBe(true);
      expect(result.data!.result).not.toContain('OVERFLOW');
    });

    it('summarizes the markdown when a prompt is given', async () => {
      mockFetcher.fetch.mockResolvedValue(contentOutcome(htmlContent));
      mockFetcher.htmlToMarkdown.mockResolvedValue('# Hello');
      mockSummarizer.summarize.mockResolvedValue({ summary: 'It greets.', truncated: true });

      const result = await tool.call({
        url: 'https://example.com/',
        prompt: 'What does it say?',
        model: 'claude-custom',
        envApiKey: 'MY_KEY',
        maxTokens: 200,
      });

      expect(mockSummarizer.summarize).toHaveBeenCalledWith('https://example.com/', '# Hello', 'What does it say?', {
        model: 'claude-custom',
        envApiKey: 'MY_KEY',
        maxTokens: 200,
      });
      expect(result.data).toMatchObject({ result: 'It greets.', truncated: true, code: 200 });
    });

    it('caps an oversized summary', async () => {
      mockFetcher.fetch.mockResolvedValue(contentOutcome(htmlContent));
      mockFetcher.htmlToMarkdown.mockResolvedValue('# Hello');
      mockSummarizer.summarize.mockResolvedValue({ summary: 'b'.repeat(MAX_RESULT_SIZE_CHARS + 1), truncated: false });

      const result = await tool.call({ url: 'https://example.com/', prompt: 'p' });

      expect(result.data!.result).toBe(
        'b'.repeat(MAX_RESULT_SIZE_CHARS) + `\n\n[Result truncated at ${MAX_RESULT_SIZE_CHARS} characters]`,
      );
    });

    it('describes binary content instead of converting it', async () => {
      mockFetcher.fetch.mockResolvedValue(
        contentOutcome({ ...htmlContent, content: '', bytes: 2048, contentType: 'application/pdf', isBinary: true }),
      );

      const result = await tool.call({ url: 'https://example.com/file.pdf', prompt: 'Summarize' });

      expect(mockFetcher.htmlToMarkdown).not.toHaveBeenCalled();
      expect(mockSummarizer.summarize).not.toHaveBeenCalled();
      expect(result.data).toMatchObject({
        bytes: 2048,
        contentType: 'application/pdf',
        result: '[Binary content fetched — application/pdf, 2048 bytes. No text extraction performed.]',
        truncated: false,
      });
    });

    it('reports a cross-host redirect with follow-up instructions', async () => {
      mockFetcher.fetch.mockResolvedValue({
        type: 'redirect',
        redirect: {
          type: 'redirect',
          originalUrl: 'https://example.com/old',
          redirectUrl: 'https://other.example.org/new',
          statusCode: 301,
        },
      });

      const result = await tool.call({ url: 'https://example.com/old', prompt: 'Find the price' });

      expect(mockFetcher.htmlToMarkdown).not.toHaveBeenCalled();
      expect(mockSummarizer.summarize).not.toHaveBeenCalled();
      const message =
        'REDIRECT DETECTED: The URL redirects to a different host.\n\n' +
        'Original URL: https://example.com/old\n' +
        'Redirect URL: https://other.example.org/new\n' +
        'Status: 301 Moved Permanently\n\n' +
        'To complete your request, call WebFetch again with these parameters:\n' +
        '- url: "https://other.example.org/new"\n' +
        '- prompt: "Find the price"\n';
      expect(result.data).toEqual({
        url: 'https://example.com/old',
        bytes: Buffer.byteLength(message),
        code: 301,
        codeText: 'Moved Permanently',
        contentType: 'text/plain',
        result: message,
        truncated: false,
        cached: false,
        durationMs: expect.any(Number) as number,
        redirect: {
          originalUrl: 'https://example.com/old',
          redirectUrl: 'https://other.example.org/new',
          statusCode: 301,
        },
      });
      expect(() => WebFetchResultSchema.parse(result.data)).not.toThrow();
    });

    it.each([
      [302, 'Found'],
      [303, 'See Other'],
      [307, 'Temporary Redirect'],
      [308, 'Permanent Redirect'],
    ])('names redirect status %i as %s and omits the prompt line without a prompt', async (statusCode, text) => {
      mockFetcher.fetch.mockResolvedValue({
        type: 'redirect',
        redirect: {
          type: 'redirect',
          originalUrl: 'https://example.com/',
          redirectUrl: 'https://other.example.org/',
          statusCode,
        },
      });

      const result = await tool.call({ url: 'https://example.com/' });

      expect(result.data!.codeText).toBe(text);
      expect(result.data!.result).toContain(`Status: ${statusCode} ${text}`);
      expect(result.data!.result).not.toContain('- prompt:');
    });

    it('propagates fetcher errors', async () => {
      mockFetcher.fetch.mockRejectedValue(new InvalidUrlError('ftp://example.com', 'unsupported protocol "ftp:"'));

      await expect(tool.call({ url: 'ftp://example.com' })).rejects.toBeInstanceOf(InvalidUrlError);
    });
  });
});
