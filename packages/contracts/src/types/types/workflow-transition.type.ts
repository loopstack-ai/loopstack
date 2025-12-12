import { z } from 'zod';
import { WorkflowTransitionConfigSchema } from '../../schemas';

export type WorkflowTransitionType = z.infer<typeof WorkflowTransitionConfigSchema>;