import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLM_MODULE_CONFIG, LlmProviderRegistry } from '@loopstack/llm-provider';
import type { LlmGenerateTextArgs, LlmModuleConfig } from '@loopstack/llm-provider';
import { MAX_MARKDOWN_LENGTH } from '../../constants.js';
import { WebFetchSummarizerService } from '../webfetch-summarizer.service.js';

const fakeProvider = (providerId: string) => ({
  providerId,
  generateText: vi.fn(),
  generateObject: vi.fn(),
  extractUsage: vi.fn(),
  toProviderMessage: vi.fn(),
});

describe('WebFetchSummarizerService', () => {
  let module: TestingModule;
  let service: WebFetchSummarizerService;

  const claude = fakeProvider('claude');
  const openai = fakeProvider('openai');

  const textResult = (text: string) => ({
    message: { role: 'assistant', text, blocks: text ? [{ type: 'text', text }] : [] },
    response: { raw: true },
  });

  const argsSent = (provider = claude) => provider.generateText.mock.calls[0][0] as LlmGenerateTextArgs;
  const promptSent = () => argsSent().prompt!;

  const compile = async (moduleConfig: LlmModuleConfig = {}) => {
    const registry = new LlmProviderRegistry();
    registry.register(claude);
    registry.register(openai);

    module = await Test.createTestingModule({
      providers: [
        WebFetchSummarizerService,
        { provide: LlmProviderRegistry, useValue: registry },
        { provide: LLM_MODULE_CONFIG, useValue: moduleConfig },
      ],
    }).compile();

    service = module.get(WebFetchSummarizerService);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('CLAUDE_WEB_FETCH_MODEL', undefined);
    claude.generateText.mockResolvedValue(textResult('A summary'));
    openai.generateText.mockResolvedValue(textResult('An OpenAI summary'));
    claude.extractUsage.mockReturnValue({ inputTokens: 1200, outputTokens: 80 });
    openai.extractUsage.mockReturnValue({ inputTokens: 900, outputTokens: 60 });
    await compile();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await module.close();
  });

  it('asks the default provider and model to apply the prompt to the content', async () => {
    const result = await service.summarize('https://example.com/', '# Page', 'What is this?');

    expect(result).toEqual({
      summary: 'A summary',
      truncated: false,
      meta: {
        provider: 'claude',
        model: 'claude-haiku-4-5-20251001',
        usage: { inputTokens: 1200, outputTokens: 80 },
      },
    });
    expect(claude.generateText).toHaveBeenCalledWith(
      {
        prompt: expect.any(String) as string,
        model: 'claude-haiku-4-5-20251001',
        providerConfig: { envApiKey: undefined, maxTokens: 1024 },
      },
      { documents: [], signal: undefined },
    );
    expect(promptSent()).toContain('---\n# Page\n---\n\nWhat is this?');
  });

  it('returns usage from the provider extractUsage', async () => {
    const result = await service.summarize('https://example.com/', 'md', 'q');

    expect(claude.extractUsage).toHaveBeenCalledWith({ raw: true });
    expect(result.meta.usage).toEqual({ inputTokens: 1200, outputTokens: 80 });
  });

  it('omits usage when the provider reports none', async () => {
    claude.extractUsage.mockReturnValue(undefined);

    const result = await service.summarize('https://example.com/', 'md', 'q');

    expect(result.meta).toEqual({ provider: 'claude', model: 'claude-haiku-4-5-20251001' });
  });

  it('uses the module-configured provider', async () => {
    await module.close();
    await compile({ provider: 'openai' });

    const result = await service.summarize('https://example.com/', 'md', 'q', { model: 'gpt-4o-mini' });

    expect(claude.generateText).not.toHaveBeenCalled();
    expect(argsSent(openai).model).toBe('gpt-4o-mini');
    expect(result).toEqual({
      summary: 'An OpenAI summary',
      truncated: false,
      meta: { provider: 'openai', model: 'gpt-4o-mini', usage: { inputTokens: 900, outputTokens: 60 } },
    });
  });

  it('prefers the per-call provider over the module config', async () => {
    await module.close();
    await compile({ provider: 'claude' });

    await service.summarize('https://example.com/', 'md', 'q', { provider: 'openai' });

    expect(openai.generateText).toHaveBeenCalled();
    expect(claude.generateText).not.toHaveBeenCalled();
  });

  it('keeps the default model over the module-configured model', async () => {
    await module.close();
    await compile({ provider: 'claude', model: 'claude-sonnet-4-6' });

    await service.summarize('https://example.com/', 'md', 'q');

    expect(argsSent().model).toBe('claude-haiku-4-5-20251001');
  });

  it('passes the api key, model and max tokens from the options', async () => {
    await service.summarize('https://example.com/', 'md', 'q', {
      envApiKey: 'MY_KEY',
      model: 'claude-custom',
      maxTokens: 256,
    });

    expect(argsSent()).toEqual(
      expect.objectContaining({ model: 'claude-custom', providerConfig: { envApiKey: 'MY_KEY', maxTokens: 256 } }),
    );
  });

  it('forwards the abort signal to the provider', async () => {
    const controller = new AbortController();

    await service.summarize('https://example.com/', 'md', 'q', { signal: controller.signal });

    expect(claude.generateText).toHaveBeenCalledWith(expect.anything(), {
      documents: [],
      signal: controller.signal,
    });
  });

  it('falls back to CLAUDE_WEB_FETCH_MODEL when no model is given', async () => {
    vi.stubEnv('CLAUDE_WEB_FETCH_MODEL', 'claude-from-env');

    await service.summarize('https://example.com/', 'md', 'q');

    expect(argsSent().model).toBe('claude-from-env');
  });

  it('prefers the explicit model over CLAUDE_WEB_FETCH_MODEL', async () => {
    vi.stubEnv('CLAUDE_WEB_FETCH_MODEL', 'claude-from-env');

    await service.summarize('https://example.com/', 'md', 'q', { model: 'claude-explicit' });

    expect(argsSent().model).toBe('claude-explicit');
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

  it('returns an empty summary when the response has no text', async () => {
    claude.generateText.mockResolvedValue(textResult(''));

    const result = await service.summarize('https://example.com/', 'md', 'q');

    expect(result.summary).toBe('');
  });

  it('throws when the provider is not registered', async () => {
    await expect(service.summarize('https://example.com/', 'md', 'q', { provider: 'missing' })).rejects.toThrow(
      'LLM provider "missing" is not registered',
    );
  });
});
