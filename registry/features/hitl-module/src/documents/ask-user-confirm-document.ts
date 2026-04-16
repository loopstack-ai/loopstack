import { z } from 'zod';
import { Document } from '@loopstack/common';

export const AskUserConfirmDocumentSchema = z
  .object({
    question: z.string(),
    answer: z.string().optional(),
  })
  .strict();

export type AskUserConfirmDocumentType = z.infer<typeof AskUserConfirmDocumentSchema>;

@Document({
  uiConfig: __dirname + '/ask-user-confirm-document.yaml',
  schema: AskUserConfirmDocumentSchema,
})
export class AskUserConfirmDocument {
  question: string;
  answer?: string;
}
