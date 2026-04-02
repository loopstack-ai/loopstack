import { z } from 'zod';
import { BaseDocument, Document, DocumentInterface, Input } from '@loopstack/common';

const ErrorDocumentSchema = z
  .object({
    error: z.string(),
  })
  .strict();

@Document({
  config: {
    type: 'document',
    description: 'Error Document.',
  },
  uiConfig: __dirname + '/error-document.yaml',
})
export class ErrorDocument extends BaseDocument implements DocumentInterface {
  @Input({
    schema: ErrorDocumentSchema,
  })
  content: z.infer<typeof ErrorDocumentSchema>;
}
