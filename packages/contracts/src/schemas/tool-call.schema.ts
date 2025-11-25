import { z } from 'zod';
import { AssignmentConfigSchema } from './assignment.schema';

export const ToolCallSchema = z.object({
  id: z.string().optional(),
  tool: z.string(),
  args: z.any().optional(),
  assign: AssignmentConfigSchema.optional(),
});

