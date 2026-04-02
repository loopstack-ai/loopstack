import { z } from 'zod';
import { BaseDocument, Document, DocumentInterface, Input } from '@loopstack/common';

const MessageDocumentSchema = z
  .object({
    role: z.string(),
    content: z.string(),
  })
  .strict();

@Document({
  config: {
    type: 'document',
    description: 'Message Document.',
  },
  uiConfig: __dirname + '/message-document.yaml',
})
export class MessageDocument extends BaseDocument implements DocumentInterface {
  @Input({
    schema: MessageDocumentSchema,
  })
  content: z.infer<typeof MessageDocumentSchema>;
}
