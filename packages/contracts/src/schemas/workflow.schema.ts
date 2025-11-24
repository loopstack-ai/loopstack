import { z } from 'zod';
import { WorkflowTransitionSchema } from './workflow-transition.schema';
import { JSONSchemaType } from './json-schema.schema';
import { BlockSchema } from './block.schema';
import { UiFormSchema } from './ui-form.schema';

export const NamespacePropsSchema = z.object({
  label: z.string(),
});

export type NamespacePropsType = z.infer<typeof NamespacePropsSchema>;

export const WorkflowBaseSchema = BlockSchema.extend({
  title: z.string().optional(),
  description: z.string().optional(),
  ui: UiFormSchema.optional()
});

export const WorkflowSchema = WorkflowBaseSchema.extend({
  type: z.literal('workflow').default('workflow'),
  transitions: z.array(WorkflowTransitionSchema).optional(),
});

export type WorkflowType = z.infer<typeof WorkflowSchema>;
