import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseDocument, Document, Input } from '@loopstack/common';

export const ClaudeMessageDocumentSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([z.string(), z.array(z.any())]),
  toolResults: z.array(z.any()).optional(),
});

export type ClaudeMessageDocumentContentType = z.infer<typeof ClaudeMessageDocumentSchema>;

@Injectable()
@Document({
  config: {
    type: 'document',
    description: 'Claude Message Document. Stores messages in Anthropic native format.',
  },
  uiConfig: __dirname + '/claude-message-document.yaml',
})
export class ClaudeMessageDocument extends BaseDocument {
  @Input({
    schema: ClaudeMessageDocumentSchema,
  })
  content: z.infer<typeof ClaudeMessageDocumentSchema>;
}
