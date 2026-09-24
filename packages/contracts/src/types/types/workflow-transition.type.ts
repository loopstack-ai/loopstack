import { z } from 'zod';
import { WorkflowTransitionDefinitionSchema, WorkflowTransitionSchema } from '../../schemas/index.js';

export type WorkflowTransitionType = z.infer<typeof WorkflowTransitionSchema>;

export type WorkflowTransitionDefinitionType = z.infer<typeof WorkflowTransitionDefinitionSchema>;
