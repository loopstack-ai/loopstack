import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const ErrorDocumentSchema = z
  .object({
    error: z.string(),
  })
  .strict();

@Document({
  schema: ErrorDocumentSchema,
  uiConfig: import.meta.dirname + '/error-document.yaml',
})
export class ErrorDocument {
  error: string;
}
