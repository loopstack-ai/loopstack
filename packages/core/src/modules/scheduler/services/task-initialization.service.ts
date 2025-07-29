import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ZodError } from 'zod';
import { TaskSchedulerService } from './task-scheduler.service';
import {
  ConfigElement,
  ScheduledTask,
  ScheduledTaskSchema,
} from '@loopstack/shared';
import { ConfigurationService } from '../../configuration';
import { StartupTask } from '@loopstack/shared/dist/schemas/startup.schema';

@Injectable()
export class TaskInitializationService {
  private readonly logger = new Logger(TaskInitializationService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly configurationService: ConfigurationService,
  ) {}

  private getStartupTasks(): ConfigElement<StartupTask>[] {
    return this.configurationService.getAll<StartupTask>('startup');
  }

  private createTask(
    task: ConfigElement<StartupTask>,
  ): ScheduledTask {
    try {
      return ScheduledTaskSchema.parse({
        id: `${task.path}:${task.name}`,
        task: task.config,
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

  private async installTasks(tasks: ConfigElement<StartupTask>[]) {
    for (const taskConfig of tasks) {
      const task = this.createTask(taskConfig);
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
    const startupTasks = this.getStartupTasks();
    this.logger.log(
      `Initializing task schedule for ${startupTasks.length} startup tasks`,
    );

    try {
      await this.clearPendingTasks();
      await this.installTasks(startupTasks);

      this.logger.debug(`Task initialization completed.`);
      this.eventEmitter.emit('tasks.initialized');
    } catch (error) {
      this.logger.error('Task initialization failed:', error);
    }
  }
}
