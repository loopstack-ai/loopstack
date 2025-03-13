import { z } from 'zod';
import { DocumentSchema } from '@loopstack/shared';

export const PromptActionPropsSchema = z.object({
  inputs: z.any(z.string()).optional(),
  output: DocumentSchema.optional(),
  system: z.string().optional(),
  task: z.string(),
  context: z.string().optional(),
  llm: z.object({
    model: z.string().optional(),
    temperature: z.number().optional()
  }).optional()
});