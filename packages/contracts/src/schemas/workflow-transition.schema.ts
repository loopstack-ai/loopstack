import { z } from 'zod';
import { AssignmentConfigSchema, AssignmentSchema } from './assignment.schema';
import { TemplateExpression } from './template-expression.schema';
import { ToolCallConfigSchema, ToolCallSchema } from './tool-call.schema';

export const WorkflowTransitionConfigSchema = z
  .object({
    id: z.string(),
    from: z.union([z.string(), z.array(z.string())]),
    to: z.string(),
    if: z.union([TemplateExpression, z.boolean()]).optional(),
    trigger: z.union([z.enum(['manual', 'onEntry']), TemplateExpression]).optional(),
    call: z.array(ToolCallConfigSchema).optional(),
    assign: AssignmentConfigSchema.optional(),
    onError: z.string().optional(),
    debug: z.boolean().optional(),
  })
  .strict();

export const WorkflowTransitionSchema = z
  .object({
    id: z.string(),
    from: z.union([z.string(), z.array(z.string())]),
    to: z.string(),
    if: z.boolean().optional(),
    trigger: z.enum(['manual', 'onEntry']).optional(),
    call: z.array(ToolCallSchema).optional(),
    assign: AssignmentSchema.optional(),
    onError: z.string().optional(),
    debug: z.boolean().optional(),
  })
  .strict();
