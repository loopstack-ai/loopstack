import { z } from 'zod';

export const ToolConfigBaseSchema = z.object({
  service: z.literal('DebugToolService'),
  name: z.string(),
  props: z.any(),
});

export const createToolConfigSchema = <T extends z.infer<typeof ToolConfigBaseSchema>>(schemas: T[]) =>
  z.discriminatedUnion('service', schemas as any);

export const ToolCallBaseSchema = z.object({
  tool: z.literal('DebugTool'),
  props: z.any(),
});

export const createToolCallSchema = <T extends z.infer<typeof ToolCallBaseSchema>>(schemas: T[]) =>
  z.discriminatedUnion('tool', schemas as any);
