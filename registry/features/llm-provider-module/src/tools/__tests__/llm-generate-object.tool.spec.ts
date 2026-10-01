import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { DOCUMENT_STORE, getBlockArgsSchema } from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { LLM_MODULE_CONFIG } from '../../llm-provider.constants.js';
import { LlmProviderRegistry } from '../../services/llm-provider-registry.js';
import { LlmGenerateObjectTool } from '../llm-generate-object.tool.js';

describe('LlmGenerateObjectTool', () => {
  let module: TestingModule;
  let tool: LlmGenerateObjectTool;

  const outputSchema = z.object({ name: z.string(), age: z.number() });
  const response = { id: 'native-1' };
  const provider = {
    providerId: 'claude',
    generateText: vi.fn(),
    generateObject: vi.fn(),
    extractUsage: vi.fn(),
    toProviderMessage: vi.fn(),
  };
  const registry = { get: vi.fn() };
  let moduleConfig: { provider?: string; model?: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    moduleConfig = {};
    registry.get.mockReturnValue(provider);
    provider.generateObject.mockResolvedValue({ data: { name: 'Ada', age: 36 }, response });
    provider.extractUsage.mockReturnValue({ inputTokens: 3, outputTokens: 4 });

    module = await createToolTest()
      .forTool(LlmGenerateObjectTool)
      .withMock(LlmProviderRegistry, registry)
      .withProviders({ provide: LLM_MODULE_CONFIG, useFactory: () => moduleConfig })
      .compile();

    tool = module.get(LlmGenerateObjectTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('requires a Zod outputSchema', () => {
    const schema = getBlockArgsSchema(tool)!;
    expect(() => schema.parse({ prompt: 'hi', outputSchema })).not.toThrow();
    expect(() => schema.parse({ prompt: 'hi', outputSchema: { type: 'object' } })).toThrow(
      'outputSchema must be a Zod schema',
    );
    expect(() => schema.parse({ prompt: 'hi' })).toThrow();
  });

  it('defaults to the claude provider and a "default" model label', async () => {
    const result = await tool.call({ prompt: 'hi', outputSchema });

    expect(registry.get).toHaveBeenCalledWith('claude');
    expect(result.metadata).toEqual({
      provider: 'claude',
      model: 'default',
      usage: { inputTokens: 3, outputTokens: 4 },
    });
  });

  it('resolves provider and model from module config, overridden by call config', async () => {
    moduleConfig.provider = 'openai';
    moduleConfig.model = 'gpt-x';

    await tool.call({ prompt: 'hi', outputSchema });
    expect(registry.get).toHaveBeenLastCalledWith('openai');
    expect(provider.generateObject.mock.calls[0][0]).toMatchObject({ model: 'gpt-x' });

    const result = await tool.call({ prompt: 'hi', outputSchema }, { config: { provider: 'claude', model: 'opus' } });
    expect(registry.get).toHaveBeenLastCalledWith('claude');
    expect(provider.generateObject.mock.calls[1][0]).toMatchObject({ model: 'opus' });
    expect(result.metadata).toMatchObject({ model: 'opus' });
  });

  it('forwards args with the output schema converted to JSON Schema', async () => {
    const documents = [{ id: 'd1' }];
    vi.mocked(module.get<DocumentStore>(DOCUMENT_STORE).findAllDocuments).mockReturnValue(documents as never);
    const messages = [{ role: 'user' as const, content: 'earlier' }];

    await tool.call(
      { prompt: 'hi', messages, outputSchema },
      { config: { system: 'extract', messagesSearchTag: 'chat', providerConfig: { temperature: 0 } } },
    );

    const [providerArgs, llmCtx] = provider.generateObject.mock.calls[0] as [Record<string, unknown>, unknown];
    expect(providerArgs).toEqual({
      system: 'extract',
      messages,
      prompt: 'hi',
      messagesSearchTag: 'chat',
      model: undefined,
      providerConfig: { temperature: 0 },
      outputSchema: expect.objectContaining({
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'number' } },
        required: ['name', 'age'],
      }),
    });
    expect(llmCtx).toEqual({ documents, signal: expect.any(AbortSignal) });
  });

  it('returns the data parsed by the output schema alongside the native response', async () => {
    provider.generateObject.mockResolvedValue({ data: { name: 'Ada', age: 36, extra: true }, response });

    const result = await tool.call({ prompt: 'hi', outputSchema });

    expect(result.data).toEqual({ data: { name: 'Ada', age: 36 }, response });
    expect(provider.extractUsage).toHaveBeenCalledWith(response);
  });

  it('omits usage when the provider reports none', async () => {
    provider.extractUsage.mockReturnValue(undefined);

    const result = await tool.call({ prompt: 'hi', outputSchema });

    expect(result.metadata).toEqual({ provider: 'claude', model: 'default' });
  });

  it('throws when the provider output does not match the schema', async () => {
    provider.generateObject.mockResolvedValue({ data: { name: 'Ada' }, response });

    await expect(tool.call({ prompt: 'hi', outputSchema })).rejects.toThrow();
  });

  it('propagates provider failures', async () => {
    provider.generateObject.mockRejectedValue(new Error('overloaded'));

    await expect(tool.call({ prompt: 'hi', outputSchema })).rejects.toThrow('overloaded');
  });
});
