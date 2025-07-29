import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ZodError } from 'zod';
import { TaskSchedulerService } from './task-scheduler.service';
import {
  ConfigElement,
  ScheduledPipelineTask,
  ScheduledPipelineTaskSchema,
  PipelineRootType,
  PipelineType,
} from '@loopstack/shared';
import { ConfigurationService } from '../../configuration';

@Injectable()
export class TaskInitializationService {
  private readonly logger = new Logger(TaskInitializationService.name);

  constructor(
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly configurationService: ConfigurationService,
  ) {}

  private getScheduledRootPipelines(): ConfigElement<PipelineRootType>[] {
    const pipelines =
      this.configurationService.getAll<PipelineType>('pipelines');
    return pipelines.filter(
      (pipeline) => pipeline.config.type === 'root' && pipeline.config.schedule,
    ) as ConfigElement<PipelineRootType>[];
  }

  private createTask(
    pipeline: ConfigElement<PipelineRootType>,
  ): ScheduledPipelineTask {
    try {
      return ScheduledPipelineTaskSchema.parse({
        id: `${pipeline.path}:${pipeline.name}`,
        metadata: {
          workspaceName: pipeline.config.workspace,
          pipelineName: pipeline.name,
          payload: {
            initializedAt: new Date(),
          },
        },
        options: pipeline.config.schedule,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => {
          const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
          return `${path}${err.message}`;
        });
        throw new Error(`Task validation failed: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  }

  private async clearPendingTasks() {
    await this.taskSchedulerService.clearAllTasks();
  }

  private async installTasks(pipelines: ConfigElement<PipelineRootType>[]) {
    for (const pipeline of pipelines) {
      const task = this.createTask(pipeline);
      const job = await this.taskSchedulerService.addTask(task);
      if (job) {
        this.logger.debug(`Successfully installed task: ${task.id}`);
      } else {
        this.logger.debug(`Failed installing task: ${task.id}`);
      }
    }
  }

  @OnEvent('configuration.initialized')
  async handleTaskInitialization() {
    const pipelines = this.getScheduledRootPipelines();
    this.logger.log(
      `Initializing task schedule for ${pipelines.length} pipelines`,
    );

    try {
      await this.clearPendingTasks();
      await this.installTasks(pipelines);

      this.logger.debug(`Task initialization completed.`);
    } catch (error) {
      this.logger.error('Task initialization failed:', error);
    }
  }
}
