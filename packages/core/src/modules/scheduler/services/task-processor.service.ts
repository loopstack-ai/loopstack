import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScheduledTask } from '@loopstack/shared';
import { OnEvent } from '@nestjs/event-emitter';
import { RunPipelineTaskProcessorService } from './task-processor/run-pipeline-task-processor.service';
import { CleanupPipelineTaskProcessorService } from './task-processor/cleanup-pipeline-task-processor.service';
import { CreateWorkspaceTaskProcessorService } from './task-processor/create-workspace-task-processor.service';
import { CreateRunPipelineTaskProcessorService } from './task-processor/create-run-pipeline-task-processor.service';

@Processor('task-queue', {
  concurrency: 1, // One job at a time
  autorun: false, // Start after tasks are initialized
})
export class TaskProcessorService extends WorkerHost {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(
    private readonly runPipelineTaskProcessorService: RunPipelineTaskProcessorService,
    private readonly createRunPipelineTaskProcessorService: CreateRunPipelineTaskProcessorService,
    private readonly cleanupPipelineTaskProcessorService: CleanupPipelineTaskProcessorService,
    private readonly createWorkspaceTaskProcessorService: CreateWorkspaceTaskProcessorService,
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
    const { id, task, metadata } = job.data;
    this.logger.debug(`Processing task ${id}`);

    try {
      await job.updateProgress(0);

      switch (task.type) {
        case 'run_pipeline':
          await this.runPipelineTaskProcessorService.process(task);
          break;
        case 'create_run_pipeline':
          await this.createRunPipelineTaskProcessorService.process(task, metadata);
          break;
        case 'cleanup_pipeline':
          await this.cleanupPipelineTaskProcessorService.process(
            task,
            metadata,
          );
          break;
        case 'create_workspace':
          await this.createWorkspaceTaskProcessorService.process(
            task,
            metadata,
          );
          break;
      }

      await job.updateProgress(100);

      this.logger.debug(`Task ${id} completed successfully`);
      return { success: true, taskId: id, completedAt: new Date() };
    } catch (error) {
      this.logger.error(`Task ${id} failed:`, error);
      throw error;
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
