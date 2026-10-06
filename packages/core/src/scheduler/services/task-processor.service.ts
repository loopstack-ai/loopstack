import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { BeforeApplicationShutdown, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { ShutdownDrainService } from '../../workflow-processor/services/shutdown-drain.service.js';
import { RunWorkflowTaskProcessorService } from './task-processor/run-workflow-task-processor.service.js';
import { WorkspaceLockService } from './workspace-lock.service.js';

/**
 * How many tasks this process runs at once, from `TASK_CONCURRENCY`.
 *
 * Exported because it is a budget an application has to plan against, not an internal detail: a workflow
 * that occupies a task for its whole lifetime — a long-running agent session, say — holds one of these
 * slots, so an app running several of them concurrently needs to know how many exist and leave headroom
 * for everything else in the process.
 */
export const TASK_CONCURRENCY = Math.max(1, parseInt(process.env.TASK_CONCURRENCY ?? '', 10) || 10);

@Processor('task-queue', {
  concurrency: TASK_CONCURRENCY,
  autorun: false,
  // A job stalls when its process dies mid-run (a crash, or a shutdown that
  // was not drained). BullMQ hands it to a worker again, which continues the
  // run from its last checkpoint. Allow a few stalls before the job fails
  // permanently — kept low enough to still stop poison jobs that crash the
  // worker on every attempt.
  maxStalledCount: 3,
})
export class TaskProcessorService extends WorkerHost implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(
    private readonly runWorkflowTaskProcessorService: RunWorkflowTaskProcessorService,
    private readonly workspaceLockService: WorkspaceLockService,
    private readonly shutdownDrain: ShutdownDrainService,
  ) {
    super();
  }

  onApplicationBootstrap() {
    this.logger.debug('Starting worker');
    this.worker.run().catch((error) => {
      this.logger.error('Worker failed to start:', error);
    });
  }

  /**
   * Drain before anything else shuts down: running workflows yield at their next transition and queue
   * their continuation, and the worker closes once its active jobs have returned — while the database and
   * the queue those jobs still write to are open.
   */
  async beforeApplicationShutdown() {
    this.logger.log('Draining: in-flight runs yield at their next transition');
    this.shutdownDrain.begin();
    await this.worker.close();
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
  async onFailed(job: Job<ScheduledTask> | undefined, err: Error) {
    const attempts = job?.attemptsMade ?? '?';
    const maxAttempts = job?.opts?.attempts ?? '?';

    // BullMQ stamps `finishedOn` only when it will not retry the job again.
    if (!job?.finishedOn) {
      this.logger.warn(`Job ${job?.id} failed attempt ${attempts}/${maxAttempts}: ${err.message}`);
      return;
    }

    this.logger.error(`Job ${job.id} failed permanently after ${attempts}/${maxAttempts} attempts: ${err.message}`);
    if (job.data.task.type !== 'run_workflow') return;
    try {
      await this.runWorkflowTaskProcessorService.abandon(job.data.task, err.message);
    } catch (error) {
      this.logger.error(`Could not fail the run of abandoned job ${job.id}:`, error);
    }
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
