import { z } from 'zod';
import { Document } from '@loopstack/common';

export const ErrorDocumentSchema = z
  .object({
    error: z.string(),
  })
  .strict();

@Document({
  schema: ErrorDocumentSchema,
  uiConfig: __dirname + '/error-document.yaml',
})
export class ErrorDocument {
  error: string;
}
