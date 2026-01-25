import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence';
import { WorkflowProcessorModule } from '../workflow-processor';
import { RunService, TaskSchedulerService } from './services';
import { EventProcessorService } from './services/event-processor.service';
import { TaskInitializationService } from './services/task-initialization.service';
import { TaskProcessorService } from './services/task-processor.service';
import { CleanupPipelineTaskProcessorService } from './services/task-processor/cleanup-pipeline-task-processor.service';
import { CreateRunPipelineTaskProcessorService } from './services/task-processor/create-run-pipeline-task-processor.service';
import { CreateWorkspaceTaskProcessorService } from './services/task-processor/create-workspace-task-processor.service';
import { RunPipelineTaskProcessorService } from './services/task-processor/run-pipeline-task-processor.service';

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
    WorkflowProcessorModule,
  ],
  providers: [
    TaskSchedulerService,
    TaskProcessorService,
    TaskInitializationService,
    RunPipelineTaskProcessorService,
    CreateRunPipelineTaskProcessorService,
    CleanupPipelineTaskProcessorService,
    CreateWorkspaceTaskProcessorService,
    RunService,
    EventProcessorService,
  ],
  exports: [TaskSchedulerService, RunService],
})
export class SchedulerModule {}
