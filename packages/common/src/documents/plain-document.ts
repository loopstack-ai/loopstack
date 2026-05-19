import { z } from 'zod';
import { Document } from '../decorators/block.decorator.js';

export const PlainDocumentSchema = z
  .object({
    text: z.string(),
  })
  .strict();

@Document({
  schema: PlainDocumentSchema,
  uiConfig: import.meta.dirname + '/plain-document.yaml',
})
export class PlainDocument {
  text: string;
}
