import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentWorkflow } from '@loopstack/agent';
import { WorkflowProcessorService } from '@loopstack/core';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { AgentAskForApprovalWorkflow } from '../agent-ask-for-approval.workflow';

const mockAgentWorkflow = { run: vi.fn() };

describe('AgentAskForApprovalWorkflow', () => {
  let module: TestingModule;
  let workflow: AgentAskForApprovalWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(AgentAskForApprovalWorkflow)
      .withMock(AgentWorkflow, mockAgentWorkflow)
      .compile();

    workflow = module.get(AgentAskForApprovalWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches AgentWorkflow with ask_for_approval in its tool list', async () => {
    mockAgentWorkflow.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.place).toBe('running');
    expect(mockAgentWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: ['ask_for_approval'],
        userMessage: expect.stringContaining('v1.2.3'),
        system: expect.stringContaining('ask_for_approval'),
      }),
      { callback: { transition: 'agentComplete' }, show: 'inline', label: 'Drafting release notes...' },
    );
  });

  it('records the agent response on completion', async () => {
    const workflowId = '00000000-0000-0000-0000-00000000000b';
    const context = createContext({
      workflowEntity: { id: workflowId, place: 'running', documents: [] },
      payload: {
        transition: {
          id: 'agentComplete',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            data: { response: 'Release notes approved and finalized.' },
          },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.place).toBe('end');
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({ text: expect.stringContaining('approved') }),
        }),
      ]),
    );
  });
});
