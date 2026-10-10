import { UnrecoverableError } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { RunWorkflowTask } from '@loopstack/contracts/types';
import { RunWorkflowTaskProcessorService } from '../run-workflow-task-processor.service.js';

describe('RunWorkflowTaskProcessorService', () => {
  let service: RunWorkflowTaskProcessorService;
  let workflowService: { getWorkflow: ReturnType<typeof vi.fn> };
  let rootProcessorService: { runWorkflow: ReturnType<typeof vi.fn> };
  let memoryMonitor: { logHeap: ReturnType<typeof vi.fn> };
  let workflowRegistryService: { hasName: ReturnType<typeof vi.fn>; names: ReturnType<typeof vi.fn> };

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
    workflowRegistryService = { hasName: vi.fn().mockReturnValue(true), names: vi.fn().mockReturnValue(['demo']) };

    service = new RunWorkflowTaskProcessorService(
      {} as never,
      workflowService as never,
      rootProcessorService as never,
      memoryMonitor as never,
      workflowRegistryService as never,
      {} as never, // orchestrator
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

  describe('a job for a workflow this deployment does not have', () => {
    beforeEach(() => {
      workflowService.getWorkflow.mockResolvedValue({
        id: workflowId,
        workflowName: 'foreign',
        status: WorkflowState.Pending,
      });
      workflowRegistryService.hasName.mockReturnValue(false);
    });

    it('refuses it without retrying, and names the shared-Redis cause', async () => {
      // UnrecoverableError stops BullMQ from burning the remaining attempts, so the run is failed
      // with this reason immediately instead of after three backed-off retries.
      await expect(service.process(makeTask())).rejects.toThrow(UnrecoverableError);
      await expect(service.process(makeTask())).rejects.toThrow(
        /Workflow "foreign" is not registered in this deployment.*sharing this Redis database.*REDIS_DB/s,
      );
      expect(rootProcessorService.runWorkflow).not.toHaveBeenCalled();
    });

    it('lists what is registered here, capped', async () => {
      workflowRegistryService.names.mockReturnValue(Array.from({ length: 14 }, (_, i) => `wf_${i}`));

      await expect(service.process(makeTask())).rejects.toThrow(/Registered here: wf_0.*wf_9 and 4 more\./s);
    });
  });
});
