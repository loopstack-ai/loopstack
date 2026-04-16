import { z } from 'zod';
import { Document } from '@loopstack/common';

export const AskUserOptionsDocumentSchema = z
  .object({
    question: z.string(),
    options: z.array(z.string()),
    allowCustomAnswer: z.boolean().optional(),
    answer: z.string().optional(),
  })
  .strict();

export type AskUserOptionsDocumentType = z.infer<typeof AskUserOptionsDocumentSchema>;

@Document({
  uiConfig: __dirname + '/ask-user-options-document.yaml',
  schema: AskUserOptionsDocumentSchema,
})
export class AskUserOptionsDocument {
  question: string;
  options: string[];
  allowCustomAnswer?: boolean;
  answer?: string;
}
