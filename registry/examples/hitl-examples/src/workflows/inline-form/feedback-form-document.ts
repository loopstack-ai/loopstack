import { z } from 'zod';
import { Document } from '@loopstack/common';

export const FeedbackFormDocumentSchema = z.object({
  subject: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
});

@Document({
  schema: FeedbackFormDocumentSchema,
  widget: './feedback-form-document.yaml',
})
export class FeedbackFormDocument {
  subject: string;
  rating: number;
  comment: string;
}
