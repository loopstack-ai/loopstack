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
  id: z.string(),
  transition: TransitionPayloadSchema.optional(),
});

export type RunPayload = z.infer<typeof RunPayloadSchema>;

export const RunPipelineTaskSchema = BaseStartupTaskSchema.extend({
  type: z.literal('run_pipeline'),
  payload: RunPayloadSchema,
});

// export const CreateRunPipelineTaskSchema = BaseStartupTaskSchema.extend({
//   type: z.literal('create_run_pipeline'),
//   payload: z.object({
//     pipeline: z.string(),
//     transition: TransitionPayloadSchema.optional(),
//   }),
//   variables: z.record(z.string(), z.any()).optional(),
// })

// export const CreateWorkspaceTaskSchema = BaseStartupTaskSchema.extend({
//   type: z.literal('create_workspace'),
//   payload: z.object({
//     workspace: z.string()
//   }),
// })
//
// const intervalRegex = /^(\d+)\s*(days?|hours?|minutes?|seconds?)$/i;

// export const CleanupPipelineTaskSchema = BaseStartupTaskSchema.extend({
//   type: z.literal('cleanup_pipeline'),
//   payload: z.object({
//     pipeline: z.string(),
//     olderThan: z.string()
//       .regex(intervalRegex, 'Duration must be in format: number followed by the unit (e.g., 30 days", "24 hours", "60 minutes")')
//       .optional(),
//     status: z.nativeEnum(PipelineState).optional(),
//     skip: z.number().optional(), // keep the latest x items
//     limit: z.number().positive().optional(), // Maximum number of pipelines to delete in one execution
//   }),
// })

export const StartupTaskSchema = z.discriminatedUnion('type', [
  RunPipelineTaskSchema,
  // CreateRunPipelineTaskSchema,
  // CleanupPipelineTaskSchema,
  // CreateWorkspaceTaskSchema,
]);

export const ScheduledTaskSchema = z.object({
  id: z.string().min(1, 'id is required'),
  task: StartupTaskSchema,
});
