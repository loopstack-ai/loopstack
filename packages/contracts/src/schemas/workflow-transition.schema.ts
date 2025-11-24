import { z } from "zod";
import { ToolCallSchema } from './tool-call.schema';
import { TemplateExpression } from './template-expression.schema';

export const WorkflowTransitionSchema = z.object({
  id: z.string(),
  from: z.union([z.string(), z.array(z.string())]).optional(),
  to: z.union([z.string(), z.array(z.string())]).optional(),
  when: z.union([
    z.enum(["manual", "onEntry"]),
    TemplateExpression,
  ]).optional(),
  call: z.array(ToolCallSchema).optional(),
  onError: z.string().optional(),
});

export type WorkflowTransitionType = z.infer<typeof WorkflowTransitionSchema>;

