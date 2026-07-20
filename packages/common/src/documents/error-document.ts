import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const ErrorDocumentSchema = z
  .object({
    error: z.string(),
  })
  .strict();

/**
 * Document that renders an error message in Studio.
 *
 * @public
 */
@Document({
  schema: ErrorDocumentSchema,
  widget: './error-document.yaml',
  tags: ['error'],
})
export class ErrorDocument {
  error: string;
}
