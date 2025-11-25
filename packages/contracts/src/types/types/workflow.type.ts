import { z } from 'zod';
import { NamespacePropsSchema, WorkflowSchema } from '../../schemas';

export type NamespacePropsType = z.infer<typeof NamespacePropsSchema>;
export type WorkflowType = z.infer<typeof WorkflowSchema>;