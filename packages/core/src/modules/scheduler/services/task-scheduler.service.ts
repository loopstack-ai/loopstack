import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { ScheduledPipelineTask } from '@loopstack/shared';

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);

  constructor(@InjectQueue('task-queue') private readonly taskQueue: Queue) {}

  async addTask(task: ScheduledPipelineTask): Promise<Job | null> {
    const { id, metadata, options = {} } = task;
    const job = await this.taskQueue.add(
      'process-task',
      {
        id,
        metadata,
      },
      {
        jobId: id,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        ...options,
      },
    );

    this.logger.debug(`Task ${id} added successfully`);

    return job;
  }

  async clearAllTasks(): Promise<void> {
    await this.taskQueue.obliterate();
  }
}
