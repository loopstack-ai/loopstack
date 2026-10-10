import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { LlmDelegateService } from '../../services/llm-delegate.service.js';
import type { LlmDelegateResult } from '../../types/index.js';
import { LlmUpdateToolResultTool } from '../llm-update-tool-result.tool.js';

describe('LlmUpdateToolResultTool', () => {
  let module: TestingModule;
  let tool: LlmUpdateToolResultTool;

  const delegateService = { updateToolResult: vi.fn() };

  const pending: LlmDelegateResult = {
    allCompleted: false,
    toolResults: [
      { type: 'tool_result', toolCallId: 't1', content: 'sync result', isError: false },
      { type: 'tool_result', toolCallId: 't2' },
    ],
    pendingCount: 1,
    errorCount: 0,
    hasErrors: false,
    errors: [],
  };
  const completedTool = { id: 't2', status: 'completed', data: { answer: 42 } };
  const completed: LlmDelegateResult = {
    ...pending,
    allCompleted: true,
    pendingCount: 0,
    toolResults: [pending.toolResults[0], { type: 'tool_result', toolCallId: 't2', content: '{"answer":42}' }],
  };

  const execute = (args: object, config?: object) =>
    module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args, config ? { config } : undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    delegateService.updateToolResult.mockResolvedValue(completed);

    module = await createToolTest()
      .forTool(LlmUpdateToolResultTool)
      .withMock(LlmDelegateService, delegateService)
      .compile();

    tool = module.get(LlmUpdateToolResultTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('requires a delegateResult with allCompleted, toolResults and pendingCount', () => {
    const schema = getBlockArgsSchema(tool)!;
    expect(() => schema.parse({ delegateResult: { allCompleted: false }, completedTool })).toThrow();
    expect(() => schema.parse({ delegateResult: pending, completedTool })).not.toThrow();
  });

  it('merges the completed tool via the delegate service', async () => {
    const envelope = await execute({ delegateResult: pending, completedTool });

    expect(delegateService.updateToolResult).toHaveBeenCalledWith(pending, completedTool);
    expect(envelope.data).toEqual(completed);
  });

  it('saves all tool results as a user tool_result message once everything completed', async () => {
    const envelope = await execute({ delegateResult: pending, completedTool }, { meta: { step: 'tools' } });

    expect(envelope.documents).toEqual([
      {
        documentName: 'llm_message',
        content: {
          role: 'user',
          blocks: [
            { type: 'tool_result', toolCallId: 't1', content: 'sync result', isError: false },
            { type: 'tool_result', toolCallId: 't2', content: '{"answer":42}', isError: false },
          ],
        },
        options: { meta: { step: 'tools' } },
      },
    ]);
  });

  it('does not save while other tool calls are still pending', async () => {
    const stillPending = { ...pending, toolResults: [...pending.toolResults] };
    delegateService.updateToolResult.mockResolvedValue(stillPending);

    const envelope = await execute({ delegateResult: pending, completedTool });

    expect(envelope.data).toEqual(stillPending);
    expect(envelope.documents).toBeUndefined();
  });

  it('does not save when save is false', async () => {
    const envelope = await execute({ delegateResult: pending, completedTool }, { save: false });

    expect(envelope.data).toEqual(completed);
    expect(envelope.documents).toBeUndefined();
  });

  it('does not save when there are no tool results', async () => {
    delegateService.updateToolResult.mockResolvedValue({ ...completed, toolResults: [] });

    const envelope = await execute({ delegateResult: pending, completedTool });

    expect(envelope.documents).toBeUndefined();
  });

  it('propagates delegate service failures', async () => {
    delegateService.updateToolResult.mockRejectedValue(new Error('unknown tool call id'));

    await expect(tool.call({ delegateResult: pending, completedTool })).rejects.toThrow('unknown tool call id');
  });
});
