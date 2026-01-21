import { z } from 'zod';
import { TemplateExpression } from './template-expression.schema';
import { ToolCallConfigSchema, ToolCallSchema } from './tool-call.schema';

export const WorkflowTransitionConfigSchema = z
  .object({
    id: z.string(),
    from: z.union([z.string(), z.array(z.string())]),
    to: z.string(),
    if: z.union([TemplateExpression, z.string(), z.literal('true'), z.literal('false')]).optional(),
    trigger: z.union([z.enum(['manual', 'onEntry']), TemplateExpression]).optional(),
    call: z.array(ToolCallConfigSchema).optional(),
    onError: z.string().optional(),
  })
  .strict();

export const WorkflowTransitionSchema = z
  .object({
    id: z.string(),
    from: z.union([z.string(), z.array(z.string())]),
    to: z.string(),
    if: z.union([z.string(), z.literal('true'), z.literal('false')]).optional(),
    trigger: z.enum(['manual', 'onEntry']).optional(),
    call: z.array(ToolCallSchema).optional(),
    onError: z.string().optional(),
  })
  .strict();
