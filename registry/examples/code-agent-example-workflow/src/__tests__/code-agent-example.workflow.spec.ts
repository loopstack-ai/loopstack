import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentWorkflow } from '@loopstack/agent';
import { RunContext, WorkflowEntity } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { CodeAgentExampleWorkflow } from '../code-agent-example.workflow';

const mockAgentWorkflow = {
  run: vi.fn(),
};

describe('CodeAgentExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: CodeAgentExampleWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(CodeAgentExampleWorkflow)
      .withOverride(AgentWorkflow, mockAgentWorkflow)
      .compile();

    workflow = module.get(CodeAgentExampleWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches AgentWorkflow and stops at exploring', async () => {
    mockAgentWorkflow.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('exploring');

    expect(mockAgentWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.any(String),
        tools: ['glob', 'grep', 'read'],
        userMessage: expect.any(String),
      }),
      { callback: { transition: 'exploreComplete' } },
    );

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: 'LinkDocument',
          content: expect.objectContaining({ workflowId: 'sub-id' }),
        }),
      ]),
    );
  });

  it('saves the agent response as a MessageDocument when resumed', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const context = {
      workflowEntity: {
        id: workflowId,
        place: 'exploring',
        documents: [],
      } as Partial<WorkflowEntity>,
      payload: {
        transition: {
          id: 'exploreComplete',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            data: { response: '- src/main.ts\n- AppModule' },
          },
        },
      },
    } as unknown as RunContext;

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: 'MessageDocument',
          content: expect.objectContaining({ content: expect.stringContaining('AppModule') }),
        }),
      ]),
    );
  });
});
