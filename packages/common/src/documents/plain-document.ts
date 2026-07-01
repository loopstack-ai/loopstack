import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const PlainDocumentSchema = z
  .object({
    text: z.string(),
  })
  .strict();

/**
 * Document that renders plain text in Studio.
 *
 * @public
 */
@Document({
  schema: PlainDocumentSchema,
  widget: './plain-document.yaml',
})
export class PlainDocument {
  text: string;
}
