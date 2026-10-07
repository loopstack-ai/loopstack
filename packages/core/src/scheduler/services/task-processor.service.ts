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

/** How long a shutdown waits for in-flight runs to yield before it closes the worker by force. */
export const DEFAULT_SHUTDOWN_DRAIN_TIMEOUT_MS = 30_000;

/** The signals a second press of which ends the drain at once. Nest ignores them while a shutdown is in progress. */
const FORCE_SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

/**
 * The drain deadline from `SHUTDOWN_DRAIN_TIMEOUT_MS` — read when the shutdown begins, so a value from `.env`
 * (loaded after this module is imported) counts.
 */
function resolveShutdownDrainTimeoutMs(): number {
  const parsed = parseInt(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SHUTDOWN_DRAIN_TIMEOUT_MS;
}

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

  /** The jobs this process is executing right now, by job id — what a drain waits for. */
  private readonly active = new Map<string, string>();
  /** Resolves the drain's wait once the last active job has returned. */
  private onIdle?: () => void;

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
   *
   * The wait is bounded. A run cannot yield inside a transition, and a transition can be a long await — a
   * container build, a clone, a command on a remote. Past `SHUTDOWN_DRAIN_TIMEOUT_MS`, or on a second
   * SIGINT/SIGTERM (Nest swallows those while a shutdown is in progress), the worker closes by force: the
   * jobs still running stall, and the queue redelivers them after restart, re-running the interrupted
   * transition from its last checkpoint — the same path a crash takes.
   */
  async beforeApplicationShutdown() {
    this.logger.log('Draining: in-flight runs yield at their next transition');
    this.shutdownDrain.begin();
    // Stop taking new jobs without waiting for the active ones — those are waited for below, on our terms.
    await this.worker.pause(true);

    const forced = await this.waitForActiveJobs(resolveShutdownDrainTimeoutMs());
    if (forced) {
      const stuck = [...this.active.values()].join(', ');
      this.logger.warn(
        `Forcing shutdown with ${this.active.size} run(s) still in a transition (${stuck}). ` +
          'The queue redelivers them after restart; the interrupted transition runs again from its checkpoint.',
      );
    }
    // BullMQ memoizes the first close() call, so the force flag has to be right the first time.
    await this.worker.close(forced);
  }

  /**
   * Wait until every active job has returned, the deadline has passed, or a second signal arrived.
   * Resolves `true` when jobs are still active — the caller closes by force then.
   */
  private waitForActiveJobs(timeoutMs: number): Promise<boolean> {
    if (this.active.size === 0) return Promise.resolve(false);

    this.logger.log(
      `Waiting for ${this.active.size} in-flight run(s) to yield — forcing in ${Math.round(timeoutMs / 1000)}s, ` +
        'or on a second SIGINT/SIGTERM',
    );

    return new Promise<boolean>((resolve) => {
      const settle = (forced: boolean) => {
        clearTimeout(timer);
        FORCE_SIGNALS.forEach((signal) => process.removeListener(signal, onSignal));
        this.onIdle = undefined;
        resolve(forced);
      };
      const onSignal = (signal: NodeJS.Signals) => {
        this.logger.warn(`Received a second ${signal} — not waiting for in-flight runs`);
        settle(true);
      };
      const timer = setTimeout(() => settle(this.active.size > 0), timeoutMs);
      timer.unref();
      this.onIdle = () => settle(false);
      FORCE_SIGNALS.forEach((signal) => process.once(signal, onSignal));
    });
  }

  async process(job: Job<ScheduledTask>) {
    const { id, workspaceId, task } = job.data;
    this.logger.debug(`Processing task ${id}`);
    // Counted from the start: a job waiting for its workspace lock is in flight as far as a drain is concerned.
    this.active.set(String(job.id), describeTask(task, id));

    try {
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
    } finally {
      this.active.delete(String(job.id));
      if (this.active.size === 0) this.onIdle?.();
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

/** One line per in-flight job for the drain's log: what runs, and where it belongs. */
function describeTask(task: ScheduledTask['task'], taskId: string): string {
  const name = task.workflowName ?? task.name;
  return task.workflowId ? `${name} (run ${task.workflowId})` : `${name} (task ${taskId})`;
}
