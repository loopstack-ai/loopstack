import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { ShutdownDrainService } from '../../../workflow-processor/services/shutdown-drain.service.js';
import { TaskProcessorService } from '../task-processor.service.js';
import { RunWorkflowTaskProcessorService } from '../task-processor/run-workflow-task-processor.service.js';
import { WorkspaceLockService } from '../workspace-lock.service.js';

/**
 * A job the queue gives up on — out of attempts, or stalled more often than allowed — must not leave its
 * run in a live state nothing will ever settle: the run fails at its place and its parent is called back.
 */
describe('TaskProcessorService — a job the queue gave up on', () => {
  let workflow: Record<string, unknown>;
  let workflowService: { findById: ReturnType<typeof vi.fn>; setWorkflowStatus: ReturnType<typeof vi.fn> };
  let orchestrator: { complete: ReturnType<typeof vi.fn> };
  let processor: TaskProcessorService;

  const job = (finishedOn?: number) =>
    ({
      id: 'job-1',
      attemptsMade: 3,
      opts: { attempts: 3 },
      finishedOn,
      data: {
        id: 'sub_workflow_execution-1',
        workspaceId: 'ws1',
        task: { name: 'sub_workflow_execution', type: 'run_workflow', workflowId: 'wf1', payload: {}, user: 'u1' },
      },
    }) as unknown as Job<ScheduledTask>;

  beforeEach(() => {
    workflow = { id: 'wf1', status: WorkflowState.Running, place: 'running', hasError: false, errorMessage: null };
    workflowService = {
      findById: vi.fn().mockResolvedValue(workflow),
      setWorkflowStatus: vi.fn(async (wf: Record<string, unknown>, status: WorkflowState) => {
        wf.status = status;
      }),
    };
    orchestrator = { complete: vi.fn().mockResolvedValue(undefined) };
    const runner = new RunWorkflowTaskProcessorService(
      {} as never,
      workflowService as never,
      {} as never,
      {} as never,
      {} as never,
      orchestrator as never,
    );
    processor = new TaskProcessorService(runner, new WorkspaceLockService(), new ShutdownDrainService());
  });

  it('fails the run at its place and calls its parent back', async () => {
    await processor.onFailed(job(Date.now()), new Error('job stalled more than allowable limit'));

    expect(workflow).toMatchObject({
      status: WorkflowState.Failed,
      place: 'running',
      hasError: true,
      errorMessage: 'job stalled more than allowable limit',
    });
    expect(orchestrator.complete).toHaveBeenCalledWith(workflow);
  });

  it('leaves the run alone while the queue still retries the job', async () => {
    await processor.onFailed(job(undefined), new Error('boom'));

    expect(workflowService.findById).not.toHaveBeenCalled();
    expect(workflow.status).toBe(WorkflowState.Running);
    expect(orchestrator.complete).not.toHaveBeenCalled();
  });

  it('leaves a run that already settled alone', async () => {
    workflow.status = WorkflowState.Canceled;

    await processor.onFailed(job(Date.now()), new Error('boom'));

    expect(workflowService.setWorkflowStatus).not.toHaveBeenCalled();
    expect(orchestrator.complete).not.toHaveBeenCalled();
  });
});
