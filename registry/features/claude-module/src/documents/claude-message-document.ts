import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, Input } from '@loopstack/common';

export const ClaudeMessageDocumentSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([z.string(), z.array(z.any())]),
});

export type ClaudeMessageDocumentContentType = z.infer<typeof ClaudeMessageDocumentSchema>;

@Injectable()
@Document({
  config: {
    type: 'document',
    description: 'Claude Message Document. Stores messages in Anthropic native format.',
  },
  configFile: __dirname + '/claude-message-document.yaml',
})
export class ClaudeMessageDocument {
  @Input({
    schema: ClaudeMessageDocumentSchema,
  })
  content: z.infer<typeof ClaudeMessageDocumentSchema>;
}
