import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TaskMetadata } from '@loopstack/shared';

@Processor('task-queue', {
  concurrency: 1 // One job at a time
})
export class TaskProcessorService extends WorkerHost {
  private readonly logger = new Logger(TaskProcessorService.name);

  async process(job: Job<{ id: string; metadata: TaskMetadata }>) {
    const { id, metadata } = job.data;

    console.log(id)
    this.logger.debug(`Processing task ${id} of type ${metadata.type}`);

    try {
      await job.updateProgress(0);

      // Your task processing logic here
      // This is where you'd implement the actual work based on metadata.type

      // todo: call workflowProcessorService

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