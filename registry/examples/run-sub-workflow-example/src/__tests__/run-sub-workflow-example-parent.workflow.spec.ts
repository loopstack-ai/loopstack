import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockConfig } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleParentWorkflow } from '../run-sub-workflow-example-parent.workflow';
import { RunSubWorkflowExampleSubWorkflow } from '../run-sub-workflow-example-sub.workflow';

const mockSubWorkflow = {
  run: vi.fn(),
};

describe('RunSubWorkflowExampleParentWorkflow', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleParentWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleParentWorkflow)
      .withMock(RunSubWorkflowExampleSubWorkflow, mockSubWorkflow)
      .compile();

    workflow = module.get(RunSubWorkflowExampleParentWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
    });

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });
  });

  describe('workflow execution', () => {
    it('should execute run_workflow transition and stop at sub_workflow_started', async () => {
      const context = createStatelessContext();

      mockSubWorkflow.run.mockResolvedValue({
        workflowId: 'test-workflow-id',
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('sub_workflow_started');

      expect(mockSubWorkflow.run).toHaveBeenCalledTimes(1);
      expect(mockSubWorkflow.run).toHaveBeenCalledWith(
        {},
        { callback: { transition: 'subWorkflowCallback' }, show: 'link', label: 'Sub-Workflow' },
      );
    });

    it('should execute sub_workflow_callback when resumed from sub_workflow_started', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      mockSubWorkflow.run.mockResolvedValue({
        workflowId: 'test-workflow-id-2',
      });

      const context = createContext({
        workflowEntity: {
          id: workflowId,
          place: 'sub_workflow_started',
          documents: [],
        },
        payload: {
          transition: {
            id: 'subWorkflowCallback',
            workflowId,
            payload: { workflowId, status: 'completed', data: { message: 'Hi mom!' } },
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('sub_workflow2_started');

      // MessageDocument should have been created
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'message',
            content: expect.objectContaining({
              role: 'assistant',
              text: 'A message from sub workflow 1: Hi mom!',
            }),
          }),
        ]),
      );

      // runWorkflow2 fires automatically and calls sub workflow again
      expect(mockSubWorkflow.run).toHaveBeenCalledTimes(1);
      expect(mockSubWorkflow.run).toHaveBeenCalledWith(
        {},
        { callback: { transition: 'subWorkflow2Callback' }, show: 'link', label: 'Sub-Workflow 2' },
      );
    });

    it('should execute sub_workflow2_callback when resumed from sub_workflow2_started', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      const context = createContext({
        workflowEntity: {
          id: workflowId,
          place: 'sub_workflow2_started',
          documents: [],
        },
        payload: {
          transition: {
            id: 'subWorkflow2Callback',
            workflowId,
            payload: { workflowId, status: 'completed', data: { message: 'Hello from sub workflow 2!' } },
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'message',
            content: expect.objectContaining({
              role: 'assistant',
              text: 'A message from sub workflow 2: Hello from sub workflow 2!',
            }),
          }),
        ]),
      );
    });
  });
});
