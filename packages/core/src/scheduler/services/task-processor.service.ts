import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { RunWorkflowTaskProcessorService } from './task-processor/run-workflow-task-processor.service.js';
import { WorkspaceLockService } from './workspace-lock.service.js';

@Processor('task-queue', {
  concurrency: 10,
  autorun: false,
})
export class TaskProcessorService extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(
    private readonly runWorkflowTaskProcessorService: RunWorkflowTaskProcessorService,
    private readonly workspaceLockService: WorkspaceLockService,
  ) {
    super();
  }

  onApplicationBootstrap() {
    this.logger.debug('Starting worker');
    this.worker.run().catch((error) => {
      this.logger.error('Worker failed to start:', error);
    });
  }

  async process(job: Job<ScheduledTask>) {
    const { id, workspaceId, task } = job.data;
    this.logger.debug(`Processing task ${id}`);

    this.logger.debug(`Acquiring workspace lock for ${workspaceId}`);
    const release = await this.workspaceLockService.acquire(workspaceId);

    try {
      await job.updateProgress(0);

      switch (task.type) {
        case 'run_workflow':
          await this.runWorkflowTaskProcessorService.process(task);
          break;
      }

      await job.updateProgress(100);

      this.logger.debug(`Task ${id} completed successfully`);
      return { taskId: id, completedAt: new Date() };
    } catch (error) {
      this.logger.error(`Task ${id} failed:`, error);
      throw error;
    } finally {
      release();
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    const attempts = job?.attemptsMade ?? '?';
    const maxAttempts = job?.opts?.attempts ?? '?';
    this.logger.error(`Job ${job?.id} failed permanently after ${attempts}/${maxAttempts} attempts: ${err.message}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} started processing`);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job ${jobId} stalled`);
  }
}
