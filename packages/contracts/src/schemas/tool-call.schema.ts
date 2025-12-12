import { z } from 'zod';
import { AssignmentConfigSchema, AssignmentSchema } from './assignment.schema';

export const ToolCallConfigSchema = z.object({
  id: z.string().optional(),
  tool: z.string(),
  args: z.any().optional(),
  assign: AssignmentConfigSchema.optional(),
});

export const ToolCallSchema = z.object({
  id: z.string().optional(),
  tool: z.string(),
  args: z.any().optional(),
  assign: AssignmentSchema.optional(),
});

