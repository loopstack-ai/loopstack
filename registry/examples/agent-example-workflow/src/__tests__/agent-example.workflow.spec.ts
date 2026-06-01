import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentWorkflow } from '@loopstack/agent';
import { RunContext, WORKFLOW_ORCHESTRATOR, WorkflowEntity } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { AgentExampleWorkflow } from '../agent-example.workflow';
import { CalculatorTool } from '../tools/calculator.tool';
import { WeatherLookupTool } from '../tools/weather-lookup.tool';

describe('AgentExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: AgentExampleWorkflow;
  let processor: WorkflowProcessorService;

  const mockOrchestrator = {
    queue: vi.fn(),
    complete: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
    cancelChildren: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(AgentExampleWorkflow)
      .withProviders(CalculatorTool, WeatherLookupTool)
      .withOverride(WORKFLOW_ORCHESTRATOR, mockOrchestrator)
      .compile();

    workflow = module.get(AgentExampleWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches AgentWorkflow and stops at running', async () => {
    mockOrchestrator.queue.mockResolvedValue({ workflowId: 'agent-sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('running');

    expect(mockOrchestrator.queue).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.any(String),
        tools: ['weather_lookup', 'calculator'],
        userMessage: expect.any(String),
      }),
      expect.objectContaining({ workflowName: AgentWorkflow.name, callback: { transition: 'agentComplete' } }),
    );

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: 'LinkDocument',
          content: expect.objectContaining({ workflowId: 'agent-sub-id' }),
        }),
      ]),
    );
  });

  it('saves the agent response as a MessageDocument when resumed', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const context = {
      workflowEntity: {
        id: workflowId,
        place: 'running',
        documents: [],
      } as Partial<WorkflowEntity>,
      payload: {
        transition: {
          id: 'agentComplete',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            data: { response: 'Tokyo is 22°C and sunny. 42 * 17 = 714.' },
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
          content: expect.objectContaining({ content: expect.stringContaining('714') }),
        }),
      ]),
    );
  });
});
