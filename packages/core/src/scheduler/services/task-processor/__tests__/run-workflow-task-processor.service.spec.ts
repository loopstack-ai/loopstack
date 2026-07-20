import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { RunWorkflowTask } from '@loopstack/contracts/types';
import { RunWorkflowTaskProcessorService } from '../run-workflow-task-processor.service.js';

describe('RunWorkflowTaskProcessorService', () => {
  let service: RunWorkflowTaskProcessorService;
  let workflowService: { getWorkflow: ReturnType<typeof vi.fn> };
  let rootProcessorService: { runWorkflow: ReturnType<typeof vi.fn> };
  let memoryMonitor: { logHeap: ReturnType<typeof vi.fn> };

  const workflowId = 'wf-1';

  const makeTask = (): RunWorkflowTask =>
    ({
      name: 'manual_execution',
      type: 'run_workflow',
      workflowId,
      payload: {},
      user: 'user-1',
    }) as unknown as RunWorkflowTask;

  beforeEach(() => {
    workflowService = { getWorkflow: vi.fn() };
    rootProcessorService = { runWorkflow: vi.fn().mockResolvedValue({}) };
    memoryMonitor = { logHeap: vi.fn() };

    service = new RunWorkflowTaskProcessorService(
      {} as never,
      workflowService as never,
      rootProcessorService as never,
      memoryMonitor as never,
      {} as never,
    );
  });

  it('executes a workflow that is not in a terminal state', async () => {
    workflowService.getWorkflow.mockResolvedValue({
      id: workflowId,
      workflowName: 'demo',
      status: WorkflowState.Pending,
    });

    await service.process(makeTask());

    expect(rootProcessorService.runWorkflow).toHaveBeenCalledTimes(1);
  });

  it.each([WorkflowState.Completed, WorkflowState.Failed, WorkflowState.Canceled])(
    'skips execution when the workflow is already %s',
    async (status) => {
      workflowService.getWorkflow.mockResolvedValue({ id: workflowId, workflowName: 'demo', status });

      await service.process(makeTask());

      expect(rootProcessorService.runWorkflow).not.toHaveBeenCalled();
    },
  );

  it('throws when the workflow cannot be found', async () => {
    workflowService.getWorkflow.mockResolvedValue(null);

    await expect(service.process(makeTask())).rejects.toThrow(`Workflow with id ${workflowId} not found.`);
    expect(rootProcessorService.runWorkflow).not.toHaveBeenCalled();
  });
});
