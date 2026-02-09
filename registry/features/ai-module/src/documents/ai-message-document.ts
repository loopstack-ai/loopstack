import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, Input } from '@loopstack/common';

export const AiMessageDocumentSchema = z.object({
  id: z.string().optional(),
  role: z.union([z.literal('system'), z.literal('user'), z.literal('assistant')]),
  metadata: z.any().optional(),
  parts: z.array(z.any()),
});

export type AiMessageDocumentContentType = z.infer<typeof AiMessageDocumentSchema>;

@Injectable()
@Document({
  config: {
    type: 'document',
    description: 'Ai Message Document.',
  },
  configFile: __dirname + '/ai-message-document.yaml',
})
export class AiMessageDocument {
  @Input({
    schema: AiMessageDocumentSchema,
  })
  content: z.infer<typeof AiMessageDocumentSchema>;
}
