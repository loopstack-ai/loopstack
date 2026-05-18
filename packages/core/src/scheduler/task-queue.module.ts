import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import { RedisOptions } from './interfaces/redis-options.interface';
import { RunService } from './services/run.service';
import { TaskProcessorService } from './services/task-processor.service';
import { CleanupWorkflowTaskProcessorService } from './services/task-processor/cleanup-workflow-task-processor.service';
import { CreateRunWorkflowTaskProcessorService } from './services/task-processor/create-run-workflow-task-processor.service';
import { CreateWorkspaceTaskProcessorService } from './services/task-processor/create-workspace-task-processor.service';
import { RunWorkflowTaskProcessorService } from './services/task-processor/run-workflow-task-processor.service';
import { TaskSchedulerService } from './services/task-scheduler.service';
import { WorkspaceLockService } from './services/workspace-lock.service';

const PROVIDERS = [
  TaskSchedulerService,
  TaskProcessorService,
  RunWorkflowTaskProcessorService,
  CreateRunWorkflowTaskProcessorService,
  CleanupWorkflowTaskProcessorService,
  CreateWorkspaceTaskProcessorService,
  RunService,
  WorkspaceLockService,
];

/**
 * Internal module that owns the BullMQ queue infrastructure.
 *
 * Kept separate from LoopCoreModule because @nestjs/bullmq's BullExplorer
 * creates duplicate Workers when @Processor is inside a @Global() module.
 * This module is NOT global — its exports are re-exported by LoopCoreModule.
 *
 * Services here that depend on LoopCoreModule providers (e.g. RootProcessorService)
 * resolve them via LoopCoreModule's @Global scope through normal constructor injection.
 */
@Module({})
export class TaskQueueModule {
  static forRoot(redis?: RedisOptions): DynamicModule {
    return {
      module: TaskQueueModule,
      imports: [
        BullModule.forRoot({
          connection: {
            host: redis?.host ?? process.env.REDIS_HOST ?? 'localhost',
            port: redis?.port ?? (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379),
            family: 0,
            ...((redis?.password ?? process.env.REDIS_PASSWORD)
              ? { password: redis?.password ?? process.env.REDIS_PASSWORD }
              : {}),
          },
        }),
        BullModule.registerQueue({
          name: 'task-queue',
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        }),
      ],
      providers: PROVIDERS,
      exports: [TaskSchedulerService, RunService],
    };
  }
}
