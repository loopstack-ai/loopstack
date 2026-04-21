import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import type { ScheduledTask } from '@loopstack/contracts/types';

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);

  constructor(@InjectQueue('task-queue') private readonly taskQueue: Queue) {}

  async addTask(startupTask: ScheduledTask): Promise<Job | null> {
    const job = await this.taskQueue.add(startupTask.task.name, startupTask, {
      jobId: startupTask.id,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...(startupTask.task.schedule ?? {}),
    });

    this.logger.debug(`Task ${startupTask.id} added successfully`);
    return job;
  }

  async removeTasksByWorkflowId(workflowId: string): Promise<number> {
    const jobs = await this.taskQueue.getJobs(['waiting', 'delayed', 'prioritized']);
    let removed = 0;
    for (const job of jobs) {
      const data = job.data as ScheduledTask | undefined;
      if (data?.task?.workflowId === workflowId) {
        try {
          await job.remove();
          removed++;
          this.logger.debug(`Removed queued job ${job.id} for workflow ${workflowId}`);
        } catch {
          // Job may have started running between getJobs and remove — ignore
        }
      }
    }
    return removed;
  }

  async clearAllTasks(): Promise<void> {
    await this.taskQueue.drain(true);
    await this.taskQueue.clean(0, 1000, 'active');
    await this.taskQueue.clean(0, 1000, 'waiting');
    await this.taskQueue.clean(0, 1000, 'completed');
    await this.taskQueue.clean(0, 1000, 'failed');

    await this.taskQueue.obliterate();
  }
}
