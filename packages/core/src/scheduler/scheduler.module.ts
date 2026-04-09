import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { PersistenceModule } from '../persistence';
import { WorkflowProcessorModule } from '../workflow-processor';
import { RunService, TaskSchedulerService } from './services';
import { TaskInitializationService } from './services/task-initialization.service';
import { TaskProcessorService } from './services/task-processor.service';
import { CleanupWorkflowTaskProcessorService } from './services/task-processor/cleanup-workflow-task-processor.service';
import { CreateRunWorkflowTaskProcessorService } from './services/task-processor/create-run-workflow-task-processor.service';
import { CreateWorkspaceTaskProcessorService } from './services/task-processor/create-workspace-task-processor.service';
import { RunWorkflowTaskProcessorService } from './services/task-processor/run-workflow-task-processor.service';
import { WorkspaceLockService } from './services/workspace-lock.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT ?? '6379', 0) : 6379,
        family: 0,
        ...(process.env.REDIS_PASSWORD
          ? {
              password: process.env.REDIS_PASSWORD,
            }
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
    PersistenceModule,
    forwardRef(() => WorkflowProcessorModule),
  ],
  providers: [
    TaskSchedulerService,
    TaskProcessorService,
    TaskInitializationService,
    RunWorkflowTaskProcessorService,
    CreateRunWorkflowTaskProcessorService,
    CleanupWorkflowTaskProcessorService,
    CreateWorkspaceTaskProcessorService,
    RunService,
    WorkspaceLockService,
  ],
  exports: [TaskSchedulerService, RunService],
})
export class SchedulerModule {}
