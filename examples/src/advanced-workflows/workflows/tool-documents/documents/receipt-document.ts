import { z } from 'zod';
import { Document } from '@loopstack/common';

export const ReceiptDocumentSchema = z
  .object({
    markdown: z.string(),
  })
  .strict();

export type ReceiptDocumentType = z.infer<typeof ReceiptDocumentSchema>;

/**
 * The receipt `create_receipt` declares on its result envelope. Its document name is `receipt`, derived from the
 * class name; the tool gets it with `resolveDocumentName(ReceiptDocument)`. The `markdown` widget renders the `markdown` field in Studio.
 */
@Document({
  schema: ReceiptDocumentSchema,
  widget: { widget: 'markdown' },
})
export class ReceiptDocument {
  markdown: string;
}
