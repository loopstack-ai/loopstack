import { z } from 'zod';
import { AssignmentConfigSchema, AssignmentSchema } from '../../schemas/index.js';

export type AssignmentType = z.infer<typeof AssignmentSchema>;
export type AssignmentConfigType = z.infer<typeof AssignmentConfigSchema>;
