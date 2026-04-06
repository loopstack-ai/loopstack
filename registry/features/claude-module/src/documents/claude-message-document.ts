import { z } from 'zod';
import { Document } from '@loopstack/common';

export const ClaudeMessageDocumentSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([z.string(), z.array(z.any())]),
  toolResults: z.array(z.any()).optional(),
});

export type ClaudeMessageDocumentContentType = z.infer<typeof ClaudeMessageDocumentSchema>;

@Document({
  schema: ClaudeMessageDocumentSchema,
  uiConfig: __dirname + '/claude-message-document.yaml',
})
export class ClaudeMessageDocument {
  role: 'user' | 'assistant';
  content: string | any[];
  toolResults?: any[];
}
