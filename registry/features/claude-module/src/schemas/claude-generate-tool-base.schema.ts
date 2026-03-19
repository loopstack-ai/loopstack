import { z } from 'zod';

export const ClaudeGenerateToolBaseSchema = z.object({
  claude: z
    .object({
      model: z.string().optional(),
      envApiKey: z.string().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.union([z.string(), z.array(z.any())]),
      }),
    )
    .optional(),
  system: z.string().optional(),
  prompt: z.string().optional(),
  messagesSearchTag: z.string().optional(),
});
