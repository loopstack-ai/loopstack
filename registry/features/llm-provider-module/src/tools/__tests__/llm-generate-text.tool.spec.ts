import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOCUMENT_STORE, TOOL_PIPELINE, TOOL_REGISTRY, getBlockArgsSchema } from '@loopstack/common';
import type { DocumentStore, ToolPipeline } from '@loopstack/common';
import { ClientMessageService } from '@loopstack/core';
import { createToolTest } from '@loopstack/testing';
import { LLM_MODULE_CONFIG } from '../../llm-provider.constants.js';
import { LlmProviderRegistry } from '../../services/llm-provider-registry.js';
import { LlmToolsHelperService } from '../../services/llm-tools-helper.service.js';
import type { LlmGenerateTextArgs, LlmGenerateTextResult, LlmStreamEvent } from '../../types/index.js';
import { LlmGenerateTextTool } from '../llm-generate-text.tool.js';

describe('LlmGenerateTextTool', () => {
  let module: TestingModule;
  let tool: LlmGenerateTextTool;

  const response = { id: 'native-1' };
  const provider = {
    providerId: 'claude',
    generateText: vi.fn(),
    generateObject: vi.fn(),
    extractUsage: vi.fn(),
    toProviderMessage: vi.fn(),
  };
  const openai = { ...provider, providerId: 'openai', generateText: vi.fn(), extractUsage: vi.fn() };
  const registry = {
    get: vi.fn((id: string) => {
      if (id === 'claude') return provider;
      if (id === 'openai') return openai;
      throw new Error(`LLM provider "${id}" is not registered.`);
    }),
  };
  const toolsHelper = { getToolDefinitions: vi.fn() };
  const toolRegistry = { getMany: vi.fn() };
  const clientMessageService = { clientId: '', dispatch: vi.fn() };
  let moduleConfig: { provider?: string; model?: string };

  const execute = (args: object, config?: object) =>
    module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args, config ? { config } : undefined);

  const assistantResult = (): LlmGenerateTextResult => ({
    message: { role: 'assistant', text: 'Hello', blocks: [{ type: 'text', text: 'Hello' }], stopReason: 'end_turn' },
    response,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    moduleConfig = {};
    clientMessageService.clientId = '';
    provider.generateText.mockImplementation(() => Promise.resolve(assistantResult()));
    provider.extractUsage.mockReturnValue({ inputTokens: 10, outputTokens: 5 });

    module = await createToolTest()
      .forTool(LlmGenerateTextTool)
      .withMock(LlmProviderRegistry, registry)
      .withMock(LlmToolsHelperService, toolsHelper)
      .withMock(TOOL_REGISTRY, toolRegistry)
      .withMock(ClientMessageService, clientMessageService)
      .withProviders({ provide: LLM_MODULE_CONFIG, useFactory: () => moduleConfig })
      .compile();

    tool = module.get(LlmGenerateTextTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('accepts a prompt or messages and rejects unknown roles', () => {
    const schema = getBlockArgsSchema(tool)!;
    expect(() => schema.parse({ prompt: 'hi' })).not.toThrow();
    expect(() => schema.parse({ messages: [{ role: 'user', content: 'hi' }] })).not.toThrow();
    expect(() => schema.parse({ messages: [{ role: 'system', content: 'hi' }] })).toThrow();
  });

  describe('provider and model resolution', () => {
    it('defaults to the claude provider and a "default" model label', async () => {
      const result = await tool.call({ prompt: 'hi' });

      expect(registry.get).toHaveBeenCalledWith('claude');
      expect(provider.generateText.mock.calls[0][0]).toMatchObject({ model: undefined });
      expect(result.metadata).toEqual({
        provider: 'claude',
        model: 'default',
        usage: { inputTokens: 10, outputTokens: 5 },
      });
    });

    it('uses the module config provider and model', async () => {
      moduleConfig.provider = 'openai';
      moduleConfig.model = 'gpt-x';
      openai.generateText.mockResolvedValue(assistantResult());
      openai.extractUsage.mockReturnValue(undefined);

      const result = await tool.call({ prompt: 'hi' });

      expect(registry.get).toHaveBeenCalledWith('openai');
      expect(openai.generateText.mock.calls[0][0]).toMatchObject({ model: 'gpt-x' });
      expect(result.metadata).toEqual({ provider: 'openai', model: 'gpt-x' });
    });

    it('lets the call config override the module config', async () => {
      moduleConfig.provider = 'openai';
      moduleConfig.model = 'gpt-x';

      const result = await tool.call({ prompt: 'hi' }, { config: { provider: 'claude', model: 'claude-opus' } });

      expect(registry.get).toHaveBeenCalledWith('claude');
      expect(provider.generateText.mock.calls[0][0]).toMatchObject({ model: 'claude-opus' });
      expect(result.metadata).toMatchObject({ provider: 'claude', model: 'claude-opus' });
    });

    it('propagates an unknown provider error without calling any provider', async () => {
      await expect(tool.call({ prompt: 'hi' }, { config: { provider: 'nope' } })).rejects.toThrow(
        'LLM provider "nope" is not registered.',
      );
      expect(provider.generateText).not.toHaveBeenCalled();
    });
  });

  describe('argument forwarding', () => {
    it('forwards prompt, messages, config and the document context', async () => {
      const documents = [{ id: 'd1' }];
      vi.mocked(module.get<DocumentStore>(DOCUMENT_STORE).findAllDocuments).mockReturnValue(documents as never);
      const messages = [{ role: 'user' as const, content: 'earlier' }];

      await tool.call(
        { prompt: 'hi', messages },
        {
          config: {
            system: 'be brief',
            messagesSearchTag: 'chat',
            providerConfig: { maxTokens: 100 },
          },
        },
      );

      const [providerArgs, llmCtx] = provider.generateText.mock.calls[0] as [LlmGenerateTextArgs, unknown];
      expect(providerArgs).toEqual({
        system: 'be brief',
        messages,
        prompt: 'hi',
        messagesSearchTag: 'chat',
        tools: undefined,
        model: undefined,
        providerConfig: { maxTokens: 100 },
        streamMessageId: undefined,
        onStream: undefined,
      });
      expect(llmCtx).toEqual({ documents, signal: expect.any(AbortSignal) });
    });

    it('resolves configured tool names into provider tool definitions', async () => {
      const instances = [{ name: 'search' }];
      const definitions = [{ type: 'tool', name: 'search', description: 'Search', inputSchema: { type: 'object' } }];
      toolRegistry.getMany.mockReturnValue(instances);
      toolsHelper.getToolDefinitions.mockReturnValue(definitions);

      await tool.call({ prompt: 'hi' }, { config: { tools: ['search'] } });

      expect(toolRegistry.getMany).toHaveBeenCalledWith(['search']);
      expect(toolsHelper.getToolDefinitions).toHaveBeenCalledWith(instances);
      expect(provider.generateText.mock.calls[0][0]).toMatchObject({ tools: definitions });
    });

    it('skips tool resolution when no tools are configured', async () => {
      await tool.call({ prompt: 'hi' }, { config: { tools: [] } });

      expect(toolRegistry.getMany).not.toHaveBeenCalled();
      expect(toolsHelper.getToolDefinitions).not.toHaveBeenCalled();
      expect(provider.generateText.mock.calls[0][0]).toMatchObject({ tools: undefined });
    });
  });

  describe('result and document', () => {
    it('returns the provider result and saves the message as an llm message document', async () => {
      const envelope = await execute({ prompt: 'hi' }, { meta: { step: 'a' } });

      expect(envelope.data).toEqual(assistantResult());
      expect(envelope.documents).toEqual([
        {
          documentName: 'llm_message',
          content: assistantResult().message,
          options: { meta: { response, provider: 'claude', step: 'a' } },
        },
      ]);
    });

    it('does not save a document when save is false', async () => {
      const envelope = await execute({ prompt: 'hi' }, { save: false });

      expect(envelope.documents).toBeUndefined();
    });

    it('omits usage from the metadata when the provider reports none', async () => {
      provider.extractUsage.mockReturnValue(undefined);

      const envelope = await execute({ prompt: 'hi' });

      expect(provider.extractUsage).toHaveBeenCalledWith(response);
      expect(envelope.metadata).toEqual({ provider: 'claude', model: 'default' });
    });
  });

  describe('streaming', () => {
    it('does not stream without a client id', async () => {
      await tool.call({ prompt: 'hi' });

      expect(clientMessageService.dispatch).not.toHaveBeenCalled();
    });

    it('streams start, provider events and done under one message id', async () => {
      clientMessageService.clientId = 'worker-1';
      provider.generateText.mockImplementation(async (args: LlmGenerateTextArgs) => {
        const messageId = args.streamMessageId!;
        const events: LlmStreamEvent[] = [
          { type: 'text_delta', messageId, delta: 'Hel' },
          { type: 'thinking_delta', messageId, delta: 'hmm' },
          { type: 'tool_call', messageId, id: 't1', name: 'search', args: { q: 'x' } },
        ];
        for (const event of events) await args.onStream!(event);
        return assistantResult();
      });

      const result = await tool.call({ prompt: 'hi' });

      const messageId = (provider.generateText.mock.calls[0][0] as LlmGenerateTextArgs).streamMessageId;
      expect(messageId).toEqual(expect.any(String));
      expect(result.data.message.id).toBe(messageId);

      const base = { userId: 'test-user', workerId: 'worker-1', workflowId: 'test-workflow', messageId };
      expect(clientMessageService.dispatch.mock.calls.map(([m]) => m as unknown)).toEqual([
        { ...base, type: 'llm.response.start' },
        { ...base, type: 'llm.response.text_delta', delta: 'Hel' },
        { ...base, type: 'llm.response.thinking_delta', delta: 'hmm' },
        { ...base, type: 'llm.response.tool_call', id: 't1', name: 'search', args: { q: 'x' } },
        { ...base, type: 'llm.response.done', message: { ...assistantResult().message, id: messageId } },
      ]);
    });

    it('dispatches an error event and rethrows when the provider fails', async () => {
      clientMessageService.clientId = 'worker-1';
      provider.generateText.mockRejectedValue(new Error('rate limited'));

      await expect(tool.call({ prompt: 'hi' })).rejects.toThrow('rate limited');

      expect(clientMessageService.dispatch).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'llm.response.error', error: 'rate limited' }),
      );
    });

    it('rethrows provider errors without dispatching when not streaming', async () => {
      provider.generateText.mockRejectedValue(new Error('boom'));

      await expect(tool.call({ prompt: 'hi' })).rejects.toThrow('boom');
      expect(clientMessageService.dispatch).not.toHaveBeenCalled();
    });
  });
});
