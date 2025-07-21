import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskExecutionEvent } from '../events/task-execution.event';

@Injectable()
export class TaskExecutionListener {
  private readonly logger = new Logger(TaskExecutionListener.name);

  @OnEvent('task.execute')
  async handleTaskExecution(event: TaskExecutionEvent) {
    this.logger.log(`Handling task execution: ${event.workspaceId}/${event.rootPipelineId}/${event.name}`);

    try {

      // implement

      this.logger.log(`Task execution completed: ${event.taskId}`);
    } catch (error) {
      this.logger.error(`Task execution failed: ${event.taskId}`, error);
      throw error; // Re-throw to allow the scheduler to handle the failure
    }
  }
}