import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaudeClientService } from '@loopstack/claude-module';
import { MAX_MARKDOWN_LENGTH } from '../../constants.js';
import { WebFetchSummarizerService } from '../webfetch-summarizer.service.js';

describe('WebFetchSummarizerService', () => {
  let module: TestingModule;
  let service: WebFetchSummarizerService;

  const create = vi.fn();
  const mockClaudeClient = { getClient: vi.fn(() => ({ messages: { create } })) };

  const promptSent = () => (create.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('CLAUDE_WEB_FETCH_MODEL', undefined);
    create.mockResolvedValue({ content: [{ type: 'text', text: 'A summary' }] });

    module = await Test.createTestingModule({
      providers: [WebFetchSummarizerService, { provide: ClaudeClientService, useValue: mockClaudeClient }],
    }).compile();

    service = module.get(WebFetchSummarizerService);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await module.close();
  });

  it('asks the default model to apply the prompt to the content', async () => {
    const result = await service.summarize('https://example.com/', '# Page', 'What is this?');

    expect(result).toEqual({ summary: 'A summary', truncated: false });
    expect(mockClaudeClient.getClient).toHaveBeenCalledWith({ envApiKey: undefined });
    expect(create).toHaveBeenCalledWith({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: expect.any(String) as string }],
    });
    expect(promptSent()).toContain('---\n# Page\n---\n\nWhat is this?');
  });

  it('passes the api key, model and max tokens from the options', async () => {
    await service.summarize('https://example.com/', 'md', 'q', {
      envApiKey: 'MY_KEY',
      model: 'claude-custom',
      maxTokens: 256,
    });

    expect(mockClaudeClient.getClient).toHaveBeenCalledWith({ envApiKey: 'MY_KEY' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-custom', max_tokens: 256 }));
  });

  it('falls back to CLAUDE_WEB_FETCH_MODEL when no model is given', async () => {
    vi.stubEnv('CLAUDE_WEB_FETCH_MODEL', 'claude-from-env');

    await service.summarize('https://example.com/', 'md', 'q');

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-from-env' }));
  });

  it('prefers the explicit model over CLAUDE_WEB_FETCH_MODEL', async () => {
    vi.stubEnv('CLAUDE_WEB_FETCH_MODEL', 'claude-from-env');

    await service.summarize('https://example.com/', 'md', 'q', { model: 'claude-explicit' });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-explicit' }));
  });

  it('truncates markdown longer than the limit', async () => {
    const markdown = 'a'.repeat(MAX_MARKDOWN_LENGTH) + 'OVERFLOW';

    const result = await service.summarize('https://example.com/', markdown, 'q');

    expect(result.truncated).toBe(true);
    expect(promptSent()).toContain('a'.repeat(MAX_MARKDOWN_LENGTH) + '\n\n[Content truncated due to length...]');
    expect(promptSent()).not.toContain('OVERFLOW');
  });

  it('keeps markdown exactly at the limit', async () => {
    const result = await service.summarize('https://example.com/', 'a'.repeat(MAX_MARKDOWN_LENGTH), 'q');

    expect(result.truncated).toBe(false);
    expect(promptSent()).not.toContain('[Content truncated');
  });

  it('applies the strict guidelines to arbitrary hosts', async () => {
    await service.summarize('https://example.com/', 'md', 'q');

    expect(promptSent()).toContain('strict 125-character maximum');
  });

  it('applies the relaxed guidelines to preapproved hosts', async () => {
    await service.summarize('https://docs.nestjs.com/providers', 'md', 'q');

    expect(promptSent()).toContain('Include relevant details, code examples, and documentation excerpts');
    expect(promptSent()).not.toContain('strict 125-character maximum');
  });

  it('returns an empty summary when the response has no text block', async () => {
    create.mockResolvedValue({ content: [{ type: 'tool_use', id: 't1', name: 'x', input: {} }] });

    expect(await service.summarize('https://example.com/', 'md', 'q')).toEqual({ summary: '', truncated: false });
  });

  it('returns an empty summary when the response is empty', async () => {
    create.mockResolvedValue({ content: [] });

    expect(await service.summarize('https://example.com/', 'md', 'q')).toEqual({ summary: '', truncated: false });
  });

  it('throws the abort reason when the signal was aborted', async () => {
    const controller = new AbortController();
    const reason = new Error('cancelled by user');
    controller.abort(reason);

    await expect(service.summarize('https://example.com/', 'md', 'q', { signal: controller.signal })).rejects.toBe(
      reason,
    );
  });
});
