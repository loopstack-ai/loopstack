import { z } from 'zod';
import { BlockSchema } from './block.schema';

export const WorkspaceSchema = BlockSchema.extend({
  type: z.literal('workspace').default('workspace'),
  title: z.string().optional(),
  description: z.string().optional(),
});
