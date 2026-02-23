import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { RunPipelineTaskProcessorService } from './task-processor/run-pipeline-task-processor.service';
import { WorkspaceLockService } from './workspace-lock.service';

@Processor('task-queue', {
  concurrency: 10,
  autorun: false, // Start after tasks are initialized
})
export class TaskProcessorService extends WorkerHost {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(
    private readonly runPipelineTaskProcessorService: RunPipelineTaskProcessorService,
    private readonly workspaceLockService: WorkspaceLockService,
    // private readonly createRunPipelineTaskProcessorService: CreateRunPipelineTaskProcessorService,
    // private readonly cleanupPipelineTaskProcessorService: CleanupPipelineTaskProcessorService,
    // private readonly createWorkspaceTaskProcessorService: CreateWorkspaceTaskProcessorService,
  ) {
    super();
  }

  @OnEvent('tasks.initialized')
  async handleStartWorker() {
    try {
      this.logger.debug('Starting worker');
      await this.worker.run();
    } catch (error) {
      this.logger.error('Failed to start worker:', error);
      throw error;
    }
  }

  async process(job: Job<ScheduledTask>) {
    const { id, workspaceId, task } = job.data;
    this.logger.debug(`Processing task ${id}`);

    this.logger.debug(`Acquiring workspace lock for ${workspaceId}`);
    const release = await this.workspaceLockService.acquire(workspaceId);

    try {
      await job.updateProgress(0);

      switch (task.type) {
        case 'run_pipeline':
          await this.runPipelineTaskProcessorService.process(task);
          break;
        // case 'create_run_pipeline':
        //   await this.createRunPipelineTaskProcessorService.process(task, metadata);
        //   break;
        // case 'cleanup_pipeline':
        //   await this.cleanupPipelineTaskProcessorService.process(
        //     task,
        //     metadata,
        //   );
        //   break;
        // case 'create_workspace':
        //   await this.createWorkspaceTaskProcessorService.process(
        //     task,
        //     metadata,
        //   );
        //   break;
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
    this.logger.error(`Job ${job?.id} failed with error: ${err.message}`);
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
