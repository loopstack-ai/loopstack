import { z } from 'zod';
import { BlockSchema } from './block.schema';
import { UiFormSchema } from './ui-form.schema';

export const ToolConfigSchema = BlockSchema.extend({
  type: z.literal('tool').default('tool'),
  description: z.string().optional(),
  ui: UiFormSchema.optional()
});

