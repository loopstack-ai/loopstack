import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentWorkflow } from '@loopstack/agent';
import { WorkflowProcessorService } from '@loopstack/core';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { AgentAskClarificationWorkflow } from '../agent-ask-clarification.workflow';

const mockAgentWorkflow = { run: vi.fn() };

describe('AgentAskClarificationWorkflow', () => {
  let module: TestingModule;
  let workflow: AgentAskClarificationWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(AgentAskClarificationWorkflow)
      .withMock(AgentWorkflow, mockAgentWorkflow)
      .compile();

    workflow = module.get(AgentAskClarificationWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches AgentWorkflow with ask_clarification in its tool list', async () => {
    mockAgentWorkflow.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.place).toBe('running');
    expect(mockAgentWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: ['ask_clarification'],
        userMessage: expect.stringContaining('holiday'),
        system: expect.stringContaining('ask_clarification'),
      }),
      { callback: { transition: 'agentComplete' }, show: 'inline', label: 'Trip planner working...' },
    );
  });

  it('records the agent response on completion', async () => {
    const workflowId = '00000000-0000-0000-0000-00000000000a';
    const context = createContext({
      workflowEntity: { id: workflowId, place: 'running', documents: [] },
      payload: {
        transition: {
          id: 'agentComplete',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            hasError: false,
            errorMessage: null,
            data: { response: 'Try Lisbon.' },
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
          content: expect.objectContaining({ role: 'assistant', text: 'Try Lisbon.' }),
        }),
      ]),
    );
  });
});
