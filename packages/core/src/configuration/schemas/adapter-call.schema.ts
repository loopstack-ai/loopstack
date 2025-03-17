import { z } from 'zod';

export const AdapterCallSchema = z.object({
  adapter: z.string(),
  props: z.any().optional(),
})

export type AdapterCallType = z.infer<typeof AdapterCallSchema>;
