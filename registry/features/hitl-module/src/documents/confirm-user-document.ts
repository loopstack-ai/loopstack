import { z } from 'zod';
import { Document } from '@loopstack/common';

export const ConfirmUserDocumentSchema = z
  .object({
    markdown: z.string(),
  })
  .strict();

export type ConfirmUserDocumentType = z.infer<typeof ConfirmUserDocumentSchema>;

@Document({
  widget: './confirm-user-document.yaml',
  schema: ConfirmUserDocumentSchema,
})
export class ConfirmUserDocument {
  markdown: string;
}
