import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

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
  configFile: __dirname + '/message-document.yaml',
})
export class MessageDocument implements DocumentInterface {
  @Input({
    schema: MessageDocumentSchema,
  })
  content: z.infer<typeof MessageDocumentSchema>;
}
