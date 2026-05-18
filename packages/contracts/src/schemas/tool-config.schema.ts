import { z } from 'zod';
import { BlockSchema } from './block.schema.js';
import { UiFormSchema } from './ui-form.schema.js';

export const ToolConfigSchema = BlockSchema.extend({
  type: z.literal('tool').default('tool'),
  description: z.string().optional(),
  ui: UiFormSchema.optional(),
});
