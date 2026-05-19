import { z } from 'zod';
import { WorkflowTransitionConfigSchema } from '../../schemas/index.js';

export type WorkflowTransitionType = z.infer<typeof WorkflowTransitionConfigSchema>;
