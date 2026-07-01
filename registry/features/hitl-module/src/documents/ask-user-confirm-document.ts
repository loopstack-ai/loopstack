import { z } from 'zod';
import { Document } from '@loopstack/common';

export const AskUserConfirmDocumentSchema = z
  .object({
    question: z.string(),
    answer: z.string().optional(),
  })
  .strict();

export type AskUserConfirmDocumentType = z.infer<typeof AskUserConfirmDocumentSchema>;

/**
 * Document that presents a yes/no question to the user and captures their answer.
 *
 * @public
 */
@Document({
  widget: './ask-user-confirm-document.yaml',
  schema: AskUserConfirmDocumentSchema,
})
export class AskUserConfirmDocument {
  question: string;
  answer?: string;
}
