import { z } from 'zod';

export const SnippetConfigSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export type SnippetConfigType = z.infer<typeof SnippetConfigSchema>;
