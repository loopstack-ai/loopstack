import { z } from 'zod';
import { Document } from '../decorators/block.decorator';

export const PlainDocumentSchema = z
  .object({
    text: z.string(),
  })
  .strict();

@Document({
  schema: PlainDocumentSchema,
  uiConfig: __dirname + '/plain-document.yaml',
})
export class PlainDocument {
  text: string;
}
