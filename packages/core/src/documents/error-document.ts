import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

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
  configFile: __dirname + '/error-document.yaml',
})
export class ErrorDocument implements DocumentInterface {
  @Input({
    schema: ErrorDocumentSchema,
  })
  content: z.infer<typeof ErrorDocumentSchema>;
}
