import { z } from 'zod';
import { BaseDocument, Document, DocumentInterface, Input } from '@loopstack/common';

const PlainDocumentSchema = z
  .object({
    text: z.string(),
  })
  .strict();

@Document({
  config: {
    type: 'document',
    description: 'Plain Document.',
  },
  uiConfig: __dirname + '/plain-document.yaml',
})
export class PlainDocument extends BaseDocument implements DocumentInterface {
  @Input({
    schema: PlainDocumentSchema,
  })
  content: z.infer<typeof PlainDocumentSchema>;
}
