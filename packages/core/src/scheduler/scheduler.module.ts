import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RunService, TaskSchedulerService } from './services';
import { TaskProcessorService } from './services/task-processor.service';
import { TaskInitializationService } from './services/task-initialization.service';
import { RunPipelineTaskProcessorService } from './services/task-processor/run-pipeline-task-processor.service';
import { CleanupPipelineTaskProcessorService } from './services/task-processor/cleanup-pipeline-task-processor.service';
import { CreateWorkspaceTaskProcessorService } from './services/task-processor/create-workspace-task-processor.service';
import { CreateRunPipelineTaskProcessorService } from './services/task-processor/create-run-pipeline-task-processor.service';
import { WorkflowProcessorModule } from '../workflow-processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: process.env.REDIS_PORT
          ? parseInt(process.env.REDIS_PORT ?? '6379', 0)
          : 6379,
        family: 0,
        // host: process.env.REDIS_HOST || 'localhost',
        // port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
        // password: process.env.REDIS_PASSWORD,
        // family: 0,
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
  ],
  exports: [TaskSchedulerService, RunService],
})
export class SchedulerModule {}
