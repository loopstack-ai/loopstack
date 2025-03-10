import { z } from 'zod';
import { DynamicSchemasInterface } from '../services/dynamic-schema-generator.service';

export const ToolConfigArgTypeSchema = z.enum(["string", "number", "boolean", "object", "array"]);

export const ToolCallDefaultSchema = z.object({
  tool: z.string(),
  args: z.array(z.any()).optional(),
})

export type ToolCallDefaultType = z.infer<typeof ToolCallDefaultSchema>;

export const ToolConfigDefaultSchema = z.object({
  name: z.string(),
  params: z
    .array(
      z.object({
        name: z.string(),
        type: ToolConfigArgTypeSchema,
      })
    )
    .optional(),
  execute: z.array(ToolCallDefaultSchema),
});

export type ToolConfigDefaultType = z.infer<typeof ToolConfigDefaultSchema>;

export const ToolConfigSchema = (dynamicSchemas: DynamicSchemasInterface) => ToolConfigDefaultSchema.extend({
  execute: z.array(dynamicSchemas.toolCallSchemas),
});