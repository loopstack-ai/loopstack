import { z } from 'zod';
import { BlockSchema } from './block.schema';
import { UiFormSchema } from './ui-form.schema';
import { WorkflowTransitionConfigSchema } from './workflow-transition.schema';

export const NamespacePropsSchema = z.object({
  label: z.string(),
});

export const WorkflowBaseSchema = BlockSchema.extend({
  title: z.string().optional(),
  description: z.string().optional(),
  ui: UiFormSchema.optional(),
});

export const WorkflowSchema = WorkflowBaseSchema.extend({
  type: z.literal('workflow').default('workflow'),
  transitions: z.array(WorkflowTransitionConfigSchema).optional(),
});
