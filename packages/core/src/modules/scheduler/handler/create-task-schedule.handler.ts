import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Handler,
  HandlerInterface,
  HandlerCallResult,
  WorkflowEntity, ExpressionString,
} from '@loopstack/shared';
import { TaskSchedulerService } from '../services/task-scheduler.service';
import { CreateTaskScheduleInterface } from '../interfaces/create-task-schedule.interface';
import { TaskType } from '../entities/scheduled-task.entity';
import { cronExpressionSchema, isoDateStringSchema } from '../schemas/task.schema';

function parseDurationToSeconds(durationString: string): number {
  const durationRegex = /^(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)$/i;
  const match = durationString.trim().match(durationRegex);

  if (!match) {
    throw new Error(`Invalid duration format: ${durationString}. Expected format like "7 days", "2 hours", "30 minutes"`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const secondsMap: Record<string, number> = {
    'second': 1,
    'seconds': 1,
    'minute': 60,
    'minutes': 60,
    'hour': 3600,
    'hours': 3600,
    'day': 86400,
    'days': 86400,
    'week': 604800,
    'weeks': 604800,
    'month': 2592000, // 30 days
    'months': 2592000,
    'year': 31536000, // 365 days
    'years': 31536000,
  };

  return value * secondsMap[unit];
}

export const config = z.object({
  name: z.union([
    ExpressionString,
    z.string().min(1, 'Task name is required').max(255, 'Task name too long'),
  ]),
  type: z.union([
    ExpressionString,
    z.nativeEnum(TaskType, { required_error: 'Task type is required' })
  ]),
  executeAt: z.optional(z.union([
    ExpressionString,
    isoDateStringSchema
  ])).describe('Execute at specific date/time (e.g., "2024-12-25T10:00:00Z")'),
  waitFor: z.optional(z.union([
    ExpressionString,
    z.string().min(1, 'Duration string is required')
  ])).describe('Wait for duration before executing (e.g., "7 days", "2 hours", "30 minutes")'),
  cronExpression: z.optional(z.union([
    ExpressionString,
    cronExpressionSchema
  ])).describe('Cron expression for recurring tasks (e.g., "0 9 * * MON" for every Monday at 9 AM)'),
  payload: z.optional(z.union([
    ExpressionString,
    z.record(z.any())
  ]))
});

const schema = z.object({
  name: z.string().min(1, 'Task name is required').max(255, 'Task name too long'),
  type: z.nativeEnum(TaskType, { required_error: 'Task type is required' }),
  executeAt: z.optional(isoDateStringSchema).describe('Execute at specific date/time (e.g., "2024-12-25T10:00:00Z")'),
  waitFor: z.optional(z.string().min(1, 'Duration string is required')).describe('Wait for duration before executing (e.g., "7 days", "2 hours", "30 minutes")'),
  cronExpression: z.optional(cronExpressionSchema).describe('Cron expression for recurring tasks (e.g., "0 9 * * MON" for every Monday at 9 AM)'),
  payload: z.optional(z.record(z.any()))
});

@Handler({
  config: schema,
  schema,
})
export class CreateTaskScheduleHandler implements HandlerInterface {
  private readonly logger = new Logger(CreateTaskScheduleHandler.name);

  constructor(private taskSchedulerService: TaskSchedulerService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
  ): Promise<HandlerCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    // Convert waitFor duration string to seconds if provided
    let durationSeconds: number | undefined;
    if (props.waitFor) {
      try {
        durationSeconds = parseDurationToSeconds(props.waitFor);
      } catch (error) {
        this.logger.error(`Failed to parse duration: ${props.waitFor}`, error);
        throw new Error(`Invalid duration format: ${props.waitFor}`);
      }
    }

    const { waitFor, ...restProps } = props;

    const task = await this.taskSchedulerService.createTask({
      workspaceId: context.workspaceId,
      rootPipelineId: context.pipelineId,
      ...restProps,
      ...(durationSeconds && { durationSeconds }),
    } satisfies CreateTaskScheduleInterface);

    return {
      success: true,
      data: task,
    };
  }
}