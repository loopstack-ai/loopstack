import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ZodError } from 'zod';
import { TaskSchedulerService } from './task-scheduler.service';
import {
  InitializationTask,
  InitializationTaskSchema,
  TaskInitializationEvent,
} from '@loopstack/shared';

@Injectable()
export class TaskInitializationService {
  private readonly logger = new Logger(TaskInitializationService.name);

  constructor(
    private readonly taskSchedulerService: TaskSchedulerService,
  ) {}

  @OnEvent('tasks.initialize')
  async handleTaskInitialization(event: TaskInitializationEvent) {
    this.logger.log(`Received task initialization event with ${event.tasks.length} tasks`);

    try {
      await this.clearPendingTasks();
      await this.installTasks(event.tasks);

      this.logger.debug(`Task initialization completed.`);
    } catch (error) {
      this.logger.error('Task initialization failed:', error);
    }
  }

  private async clearPendingTasks() {
    await this.taskSchedulerService.clearAllTasks();
  }

  private async installTasks(
    tasks: InitializationTask[],
  ) {
    for (const task of tasks) {
      this.validateTask(task);
      const job = await this.taskSchedulerService.addTask(task.id, task.metadata, task.options);

      if (job) {
        this.logger.debug(`Successfully installed task: ${task.id}`);
      } else {
        this.logger.debug(`Failed installing task: ${task.id}`);
      }
    }
  }

  private validateTask(task: InitializationTask): void {
    try {
      InitializationTaskSchema.parse(task);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => {
          const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
          return `${path}${err.message}`;
        });
        throw new Error(`Task validation failed: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  }

}