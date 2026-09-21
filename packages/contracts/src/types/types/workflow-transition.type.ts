import { z } from 'zod';
import { WorkflowTransitionSchema } from '../../schemas/index.js';

export type WorkflowTransitionType = z.infer<typeof WorkflowTransitionSchema>;
