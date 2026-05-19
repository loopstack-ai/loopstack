import { z } from 'zod';
import { NamespacePropsSchema, WorkflowSchema } from '../../schemas/index.js';

export type NamespacePropsType = z.infer<typeof NamespacePropsSchema>;
export type WorkflowType = z.infer<typeof WorkflowSchema>;
