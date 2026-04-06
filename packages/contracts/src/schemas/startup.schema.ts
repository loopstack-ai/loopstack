import { z } from 'zod';
import { TransitionPayloadSchema } from './transition-payload.schema';

const RepeatOptionsSchema = z.object({
  every: z.number().nonnegative().optional().describe('Repeat every X milliseconds. Example: 60000 for every minute'),
  startDate: z
    .string()
    .optional()
    .describe('ISO string or timestamp when to start repeating. Example: "2025-01-01T00:00:00.000Z" or Date.now()'),
  endDate: z
    .string()
    .optional()
    .describe('ISO string or timestamp when to stop repeating. Example: "2025-12-31T23:59:59.999Z"'),
  limit: z.number().nonnegative().optional().describe('Maximum number of times to repeat. Example: 100'),
  immediately: z.boolean().optional().describe('Whether to run the job immediately when created. Default: false'),
  pattern: z
    .string()
    .optional()
    .describe(
      'Cron pattern for scheduling. Examples: "0 2 * * *" (daily at 2am), "*/15 * * * *" (every 15 min), "0 9 * * MON-FRI" (weekdays at 9am)',
    ),
  tz: z
    .string()
    .optional()
    .describe(
      'IANA timezone for cron pattern. Examples: "UTC", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"',
    ),
});

export const JobsScheduleSchema = z
  .object({
    delay: z.number().nonnegative().optional(),
    repeat: RepeatOptionsSchema.optional(),
  })
  .partial();

export const BaseStartupTaskSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  type: z.string(),
  payload: z.any(), // Keeping payload flexible as requested
  user: z.string(),
  schedule: JobsScheduleSchema.optional(),
});

export const RunPayloadSchema = z.object({
  transition: TransitionPayloadSchema.optional(),
});

export type RunPayload = z.infer<typeof RunPayloadSchema>;

export const RunWorkflowTaskSchema = BaseStartupTaskSchema.extend({
  type: z.literal('run_workflow'),
  workspaceId: z.string().optional(),
  workflowId: z.string().optional(),
  correlationId: z.string().optional(),
  alias: z.string().optional(),
  args: z.record(z.string(), z.any()).optional(),
  payload: RunPayloadSchema,
});

export const StartupTaskSchema = z.discriminatedUnion('type', [RunWorkflowTaskSchema]);

export const ScheduledTaskSchema = z.object({
  id: z.string().min(1, 'id is required'),
  workspaceId: z.string().min(1, 'workspaceId is required'),
  task: StartupTaskSchema,
});
