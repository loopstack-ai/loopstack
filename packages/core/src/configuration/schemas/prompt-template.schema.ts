import { z } from 'zod';

export const PromptTemplateSchema = z.object({
  name: z.string(),
  adapter: z.string().optional(),
  systemPrompt: z.string().optional(),
  prompt: z.string(),
  output: z.string(),
});

export type PromptTemplateType = z.infer<typeof PromptTemplateSchema>;
