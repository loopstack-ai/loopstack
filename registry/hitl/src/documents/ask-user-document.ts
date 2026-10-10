import { z } from 'zod';
import { Document } from '@loopstack/common';

export const AskUserDocumentSchema = z
  .object({
    question: z.string(),
    answer: z.string().optional(),
  })
  .strict();

export type AskUserDocumentType = z.infer<typeof AskUserDocumentSchema>;

/**
 * Document that presents a free-text question to the user and captures their answer.
 *
 * @public
 */
@Document({
  widget: './ask-user-document.yaml',
  schema: AskUserDocumentSchema,
})
export class AskUserDocument {
  question: string;
  answer?: string;
}
