import { z } from 'zod';

export const ToolCallSchema = z.object({
  tool: z.string(),
  props: z.any().optional(),
});

export type ToolCallType = z.infer<typeof ToolCallSchema>;
