import { z } from 'zod';
import { RunPipelineTaskSchema, ScheduledTaskSchema } from '../../schemas';

export type RunPipelineTask = z.infer<typeof RunPipelineTaskSchema>;
export type ScheduledTask = z.infer<typeof ScheduledTaskSchema>;
