import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { LlmDelegateService } from '../../services/llm-delegate.service.js';
import type { LlmDelegateResult, LlmNormalizedMessage } from '../../types/index.js';
import { LlmDelegateToolCallsTool } from '../llm-delegate-tool-calls.tool.js';

describe('LlmDelegateToolCallsTool', () => {
  let module: TestingModule;
  let tool: LlmDelegateToolCallsTool;

  const delegateService = { delegateToolCalls: vi.fn() };
  const callback = { transition: 'toolResultReceived' };
  const message: LlmNormalizedMessage = {
    role: 'assistant',
    text: 'Let me look.',
    blocks: [
      { type: 'text', text: 'Let me look.' },
      { type: 'tool_call', id: 't1', name: 'search', args: { q: 'x' } },
      { type: 'tool_call', id: 't2', name: 'read', args: { path: 'a' } },
    ],
    stopReason: 'tool_use',
  };

  const completed: LlmDelegateResult = {
    allCompleted: true,
    toolResults: [
      { type: 'tool_result', toolCallId: 't1', content: 'found', isError: false },
      { type: 'tool_result', toolCallId: 't2' },
    ],
    pendingCount: 0,
    errorCount: 0,
    hasErrors: false,
    errors: [],
  };

  const execute = (args: object, config?: object) =>
    module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args, config ? { config } : undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    delegateService.delegateToolCalls.mockResolvedValue(completed);

    module = await createToolTest()
      .forTool(LlmDelegateToolCallsTool)
      .withMock(LlmDelegateService, delegateService)
      .compile();

    tool = module.get(LlmDelegateToolCallsTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('requires message, tools and callback', () => {
    const schema = getBlockArgsSchema(tool)!;
    expect(() => schema.parse({ message, tools: ['search'] })).toThrow();
    expect(() => schema.parse({ message, tools: ['search'], callback })).not.toThrow();
  });

  it('extracts the tool_call blocks and delegates them with the offered tools and callback', async () => {
    await execute({ message, tools: ['search', 'read'], callback });

    expect(delegateService.delegateToolCalls).toHaveBeenCalledWith(
      [
        { id: 't1', name: 'search', args: { q: 'x' } },
        { id: 't2', name: 'read', args: { path: 'a' } },
      ],
      ['search', 'read'],
      callback,
    );
  });

  it('delegates an empty list when the message has no blocks', async () => {
    await execute({ message: { role: 'assistant', text: 'done' }, tools: [], callback });

    expect(delegateService.delegateToolCalls).toHaveBeenCalledWith([], [], callback);
  });

  it('returns the delegate result and saves completed results as a user tool_result message', async () => {
    const envelope = await execute({ message, tools: ['search', 'read'], callback }, { meta: { step: 'tools' } });

    expect(envelope.data).toEqual(completed);
    expect(envelope.documents).toEqual([
      {
        documentName: 'llm_message',
        content: {
          role: 'user',
          blocks: [
            { type: 'tool_result', toolCallId: 't1', content: 'found', isError: false },
            { type: 'tool_result', toolCallId: 't2', content: '', isError: false },
          ],
        },
        options: { meta: { step: 'tools' } },
      },
    ]);
  });

  it('does not save while tool calls are still pending', async () => {
    const pending: LlmDelegateResult = { ...completed, allCompleted: false, pendingCount: 1 };
    delegateService.delegateToolCalls.mockResolvedValue(pending);

    const envelope = await execute({ message, tools: ['search', 'read'], callback });

    expect(envelope.data).toEqual(pending);
    expect(envelope.documents).toBeUndefined();
  });

  it('does not save when there are no tool results', async () => {
    delegateService.delegateToolCalls.mockResolvedValue({ ...completed, toolResults: [] });

    const envelope = await execute({ message, tools: [], callback });

    expect(envelope.documents).toBeUndefined();
  });

  it('does not save when save is false', async () => {
    const envelope = await execute({ message, tools: ['search', 'read'], callback }, { save: false });

    expect(envelope.documents).toBeUndefined();
  });

  it('saves error results with isError set', async () => {
    delegateService.delegateToolCalls.mockResolvedValue({
      ...completed,
      toolResults: [{ type: 'tool_result', toolCallId: 't1', content: 'not available', isError: true }],
      errorCount: 1,
      hasErrors: true,
      errors: [{ toolName: 'search', toolCallId: 't1', message: 'not available' }],
    });

    const envelope = await execute({ message, tools: [], callback });

    expect(envelope.documents?.[0].content).toEqual({
      role: 'user',
      blocks: [{ type: 'tool_result', toolCallId: 't1', content: 'not available', isError: true }],
    });
  });

  it('propagates delegate service failures', async () => {
    delegateService.delegateToolCalls.mockRejectedValue(new Error('registry down'));

    await expect(tool.call({ message, tools: ['search'], callback })).rejects.toThrow('registry down');
  });
});
