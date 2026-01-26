import { z } from 'zod';

export const AiGenerateToolBaseSchema = z.object({
  llm: z
    .object({
      model: z.string().optional(),
      provider: z.string().optional(),
      envApiKey: z.string().optional(),
      cacheResponse: z.boolean().optional(),
    })
    .optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'assistant', 'user', 'tool']),
        content: z.any(),
      }),
    )
    .optional(),
  prompt: z.string().optional(),
  messagesSearchTag: z.string().optional(),
});
