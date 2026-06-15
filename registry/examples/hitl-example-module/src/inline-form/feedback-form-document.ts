import { z } from 'zod';
import { Document } from '@loopstack/common';

export const FeedbackFormDocumentSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string(),
});

@Document({
  schema: FeedbackFormDocumentSchema,
  widget: __dirname + '/feedback-form-document.yaml',
})
export class FeedbackFormDocument {
  rating: number;
  comment: string;
}
