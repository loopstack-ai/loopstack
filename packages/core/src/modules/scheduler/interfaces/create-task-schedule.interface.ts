import { TaskType } from '../entities/scheduled-task.entity';

export interface CreateTaskScheduleInterface {
  workspaceId: string;
  rootPipelineId: string;
  name: string;
  type: TaskType;
  executeAt?: string; // For ONE_TIME_DATE
  durationSeconds?: number; // For ONE_TIME_DURATION
  cronExpression?: string; // For RECURRING_CRON
  payload?: Record<string, any>;
}