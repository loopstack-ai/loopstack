import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

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
  configFile: __dirname + '/plain-document.yaml',
})
export class PlainDocument implements DocumentInterface {
  @Input({
    schema: PlainDocumentSchema,
  })
  content: z.infer<typeof PlainDocumentSchema>;
}
