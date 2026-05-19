import { z } from 'zod';
import { RunWorkflowTaskSchema, ScheduledTaskSchema } from '../../schemas/index.js';

export type RunWorkflowTask = z.infer<typeof RunWorkflowTaskSchema>;
export type ScheduledTask = z.infer<typeof ScheduledTaskSchema>;
