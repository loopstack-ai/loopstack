import { z } from 'zod';

export const RuntimeToolResultSchema = z.record(
  z.string(),
  z.record(
    z.string(),
    z.object({
      data: z.any(),
    }),
  ),
);

export type RuntimeToolResult = z.infer<typeof RuntimeToolResultSchema>;
