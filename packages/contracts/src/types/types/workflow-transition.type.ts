import { z } from 'zod';
import { WorkflowTransitionSchema } from '../../schemas';

export type WorkflowTransitionType = z.infer<typeof WorkflowTransitionSchema>;