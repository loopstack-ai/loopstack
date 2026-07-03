import { z } from 'zod';
import { SortOrder } from '../enums/sort-order.enum.js';

export const SortBySchema = z.object({
  field: z.string().min(1),
  order: z.enum(SortOrder),
});
export type SortByInterface = z.infer<typeof SortBySchema>;

export const BatchDeleteSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
});
export type BatchDeleteInterface = z.infer<typeof BatchDeleteSchema>;

export const BatchDeleteResultSchema = z.object({
  deleted: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), error: z.string() })),
});
export type BatchDeleteResultInterface = z.infer<typeof BatchDeleteResultSchema>;
