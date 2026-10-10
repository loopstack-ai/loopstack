import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentWorkflow } from '@loopstack/agent';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolCallOptions, ToolPipeline } from '@loopstack/common';
import { GlobTool, GrepTool, ReadTool } from '@loopstack/remote-client';
import { createToolTest } from '@loopstack/testing';
import { ExploreTask, ExploreTaskInput } from '../explore-task.tool.js';

describe('ExploreTask', () => {
  let module: TestingModule;
  let tool: ExploreTask;

  const mockAgentWorkflow = {
    run: vi.fn(),
  };

  // `tool.call()` throws on a pending envelope; the pipeline returns the envelope itself.
  const execute = (args: ExploreTaskInput, options?: ToolCallOptions) =>
    module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args, options);

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAgentWorkflow.run.mockResolvedValue({ workflowId: 'wf-explore' });

    module = await createToolTest()
      .forTool(ExploreTask)
      .withMock(AgentWorkflow, mockAgentWorkflow)
      .withMock(GlobTool, {})
      .withMock(GrepTool, {})
      .withMock(ReadTool, {})
      .compile();

    tool = module.get(ExploreTask);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validation', () => {
    it('requires instructions', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ instructions: 42 })).toThrow();
      expect(() => schema.parse({ instructions: 'Find the auth guard' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ instructions: 'Find the auth guard', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('launches the explore sub-agent with the read-only tools and returns a pending envelope', async () => {
      const callback = { transition: 'onExplored' };

      const result = await execute({ instructions: 'Find the auth guard' }, { callback });

      expect(mockAgentWorkflow.run).toHaveBeenCalledWith(
        {
          system: expect.stringContaining('codebase exploration agent') as string,
          tools: ['glob', 'grep', 'read'],
          userMessage: 'Find the auth guard',
        },
        { callback, show: 'inline', label: 'Exploring...' },
      );
      expect(result).toEqual({
        data: { workflowId: 'wf-explore' },
        pending: { workflowId: 'wf-explore' },
      });
    });

    it('passes an undefined callback when none is given', async () => {
      await execute({ instructions: 'List modules' });

      expect(mockAgentWorkflow.run.mock.calls[0][1]).toEqual({
        callback: undefined,
        show: 'inline',
        label: 'Exploring...',
      });
    });

    it('rejects through tool.call() because the envelope is pending', async () => {
      await expect(tool.call({ instructions: 'List modules' })).rejects.toThrow('returned pending');
    });

    it('propagates a sub-workflow launch failure', async () => {
      mockAgentWorkflow.run.mockRejectedValue(new Error('queue down'));

      await expect(execute({ instructions: 'List modules' })).rejects.toThrow('queue down');
    });
  });

  describe('complete', () => {
    it('returns the sub-agent response text', async () => {
      const result = await tool.complete({ workflowId: 'wf-explore', data: { response: 'The guard is in auth.ts' } });

      expect(result).toEqual({ data: 'The guard is in auth.ts' });
    });

    it('falls back to the raw result when there is no response text', async () => {
      const raw = { workflowId: 'wf-explore', data: { other: 1 } };

      const result = await tool.complete(raw);

      expect(result).toEqual({ data: raw });
    });

    it('falls back to the raw result when there is no data', async () => {
      const raw = { workflowId: 'wf-explore' };

      expect(await tool.complete(raw)).toEqual({ data: raw });
    });
  });
});
