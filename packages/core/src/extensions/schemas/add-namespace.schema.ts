import { z } from 'zod';

export const AddNamespaceSchema = z.object({
  label: z.string(),
  meta: z.any().optional(),
});