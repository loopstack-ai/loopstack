import { z } from 'zod';
import { Document } from '@loopstack/common';

export const AiMessageDocumentSchema = z.object({
  id: z.string().optional(),
  role: z.union([z.literal('system'), z.literal('user'), z.literal('assistant')]),
  metadata: z.any().optional(),
  parts: z.array(z.any()),
});

export type AiMessageDocumentContentType = z.infer<typeof AiMessageDocumentSchema>;

@Document({
  schema: AiMessageDocumentSchema,
  uiConfig: __dirname + '/ai-message-document.yaml',
})
export class AiMessageDocument {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  metadata?: any;
  parts: any[];
}
