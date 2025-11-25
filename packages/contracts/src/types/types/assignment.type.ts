import { z } from 'zod';
import { AssignmentConfigSchema, AssignmentSchema } from '../../schemas';

export type AssignmentType = z.infer<typeof AssignmentSchema>;
export type AssignmentConfigType = z.infer<typeof AssignmentConfigSchema>;