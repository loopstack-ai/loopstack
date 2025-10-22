import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ZodError } from 'zod';
import { TaskSchedulerService } from './task-scheduler.service';
import {
  ConfigElement,
  ScheduledTask,
  ScheduledTaskSchema,
} from '@loopstack/shared';
import { StartupTask } from '@loopstack/shared/dist/schemas/startup.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TaskInitializationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaskInitializationService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly taskSchedulerService: TaskSchedulerService,
  ) {}

  private getStartupTasks(): ConfigElement<StartupTask>[] {
    return [];
    // todo
    // this.configurationService.getAll<StartupTask>('startup');
  }

  private createTask(task: ConfigElement<StartupTask>): ScheduledTask {
    try {
      return ScheduledTaskSchema.parse({
        id: `${task.path}:${task.name}`,
        task: task.config,
        metadata: task,
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

  private isEnabled(): boolean {
    return this.configService.get<boolean>('runStartupTasks', true);
  }

  async onApplicationBootstrap() {
    if (!this.isEnabled()) {
      this.eventEmitter.emit('tasks.initialized');
      return;
    }

    const startupTasks = this.getStartupTasks();
    this.logger.log(
      `Initializing task schedule for ${startupTasks.length} startup tasks`,
    );

    try {
      await this.clearPendingTasks();
      await this.installTasks(startupTasks);
      this.logger.debug(`Task initialization completed.`);
    } catch (error) {
      this.logger.error('Task initialization failed:', error);
    } finally {
      this.eventEmitter.emit('tasks.initialized');
    }
  }
}
