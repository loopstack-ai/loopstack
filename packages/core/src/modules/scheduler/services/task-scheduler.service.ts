import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import CronExpressionParser from 'cron-parser';
import { ScheduledTask, TaskType, TaskStatus } from '../entities/scheduled-task.entity';
import { TaskExecutionEvent } from '../events/task-execution.event';
import { CreateTaskScheduleInterface } from '../interfaces/create-task-schedule.interface';

@Injectable()
export class TaskSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TaskSchedulerService.name);
  private readonly processingTasks = new Set<string>();

  constructor(
    @InjectRepository(ScheduledTask)
    private readonly taskRepository: Repository<ScheduledTask>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('TaskSchedulerService initialized');
    // Cleanup any tasks that might be stuck in processing state on startup
    await this.cleanupStuckTasks();
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processScheduledTasks() {
    try {
      const now = new Date();
      const dueTasks = await this.taskRepository.find({
        where: {
          status: TaskStatus.ACTIVE,
          nextExecutionAt: LessThanOrEqual(now),
        },
        order: { nextExecutionAt: 'ASC' },
        take: 100, // Process max 100 tasks per cycle
      });

      if (dueTasks.length === 0) {
        return;
      }

      this.logger.log(`Processing ${dueTasks.length} due tasks`);

      const taskPromises = dueTasks.map(task => this.executeTask(task));
      await Promise.allSettled(taskPromises);
    } catch (error) {
      this.logger.error('Error processing scheduled tasks:', error);
    }
  }

  async createTask(createTaskRequest: CreateTaskScheduleInterface): Promise<ScheduledTask> {
    const task = new ScheduledTask();
    task.workspaceId = createTaskRequest.workspaceId;
    task.rootPipelineId = createTaskRequest.rootPipelineId;
    task.name = createTaskRequest.name;
    task.type = createTaskRequest.type;
    task.payload = createTaskRequest.payload || {};

    // Calculate nextExecutionAt based on task type
    task.nextExecutionAt = this.calculateNextExecution(createTaskRequest);

    // Set type-specific fields
    if (createTaskRequest.type === TaskType.ONE_TIME_DURATION) {
      if (!createTaskRequest.durationSeconds) {
        throw new Error(`Scheduled task of type "ONE_TIME_DURATION" must have a duration specified.`)
      }

      task.durationSeconds = createTaskRequest.durationSeconds;
    } else if (createTaskRequest.type === TaskType.RECURRING_CRON) {
      if (!createTaskRequest.cronExpression) {
        throw new Error(`Scheduled task of type "RECURRING_CRON" must have a cronExpression specified.`)
      }

      task.cronExpression = createTaskRequest.cronExpression;
    }

    return this.taskRepository.save(task);
  }

  async removeTask(workspaceId: string, rootPipelineId: string, name: string): Promise<void> {
    const result = await this.taskRepository.delete({
      workspaceId,
      rootPipelineId,
      name,
    });

    if (result.affected === 0) {
      throw new Error(`Task not found: ${workspaceId}/${rootPipelineId}/${name}`);
    }
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    // Prevent duplicate execution
    if (this.processingTasks.has(task.id)) {
      return;
    }

    this.processingTasks.add(task.id);

    try {
      this.logger.log(`Executing task: ${task.workspaceId}/${task.rootPipelineId}/${task.name}`);

      // Emit the task execution event
      const event = new TaskExecutionEvent(
        task.id,
        task.workspaceId,
        task.rootPipelineId,
        task.name,
        task.payload,
      );

      await this.eventEmitter.emitAsync('task.execute', event);

      // Update task execution stats
      task.executionCount++;
      task.lastExecutionAt = new Date();
      task.lastError = null;

      // Calculate next execution for recurring tasks
      if (task.type === TaskType.RECURRING_CRON) {
        task.nextExecutionAt = this.calculateNextCronExecution(task.cronExpression);
      } else {
        // One-time tasks are completed
        task.status = TaskStatus.COMPLETED;
        task.nextExecutionAt = null;
      }

      await this.taskRepository.save(task);

      this.logger.log(`Task executed successfully: ${task.workspaceId}/${task.rootPipelineId}/${task.name}`);
    } catch (error) {
      this.logger.error(`Task execution failed: ${task.workspaceId}/${task.rootPipelineId}/${task.name}`, error);
      await this.handleTaskFailure(task, error);
    } finally {
      this.processingTasks.delete(task.id);
    }
  }

  private async handleTaskFailure(task: ScheduledTask, error: any): Promise<void> {
    task.failureCount++;
    task.lastFailureAt = new Date();
    task.lastError = error.message || 'Unknown error';

    // Implement retry logic for recurring tasks
    if (task.type === TaskType.RECURRING_CRON) {
      if (task.failureCount >= 3) {
        this.logger.warn(`Task paused due to repeated failures: ${task.workspaceId}/${task.rootPipelineId}/${task.name}`);
        task.status = TaskStatus.FAILED;
        task.nextExecutionAt = null;
      } else {
        // Retry after 5 minutes
        task.nextExecutionAt = new Date(Date.now() + 5 * 60 * 1000);
      }
    } else {
      // One-time tasks are marked as failed
      task.status = TaskStatus.FAILED;
      task.nextExecutionAt = null;
    }

    await this.taskRepository.save(task);
  }

  private calculateNextExecution(dto: Partial<CreateTaskScheduleInterface>): Date {
    const now = new Date();

    switch (dto.type) {
      case TaskType.ONE_TIME_DATE:
        if (!dto.executeAt) {
          throw new Error('executeAt is required for ONE_TIME_DATE tasks');
        }
        return new Date(dto.executeAt);

      case TaskType.ONE_TIME_DURATION:
        if (!dto.durationSeconds) {
          throw new Error('durationSeconds is required for ONE_TIME_DURATION tasks');
        }
        return new Date(now.getTime() + dto.durationSeconds * 1000);

      case TaskType.RECURRING_CRON:
        if (!dto.cronExpression) {
          throw new Error('cronExpression is required for RECURRING_CRON tasks');
        }
        return this.calculateNextCronExecution(dto.cronExpression);

      default:
        throw new Error(`Unsupported task type: ${dto.type}`);
    }
  }

  private calculateNextCronExecution(cronExpression: string): Date {
    try {
      const interval = CronExpressionParser.parse(cronExpression);
      return interval.next().toDate();
    } catch (error) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
  }

  private async cleanupStuckTasks(): Promise<void> {
    // This method can be used to clean up any tasks that might be stuck
    // in processing state due to unexpected shutdowns
    this.logger.log('Cleaning up stuck tasks...');
    this.processingTasks.clear();
  }
}