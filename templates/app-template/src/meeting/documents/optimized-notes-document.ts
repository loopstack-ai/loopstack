import { z } from 'zod';
import { BaseDocument, Document, DocumentInterface, Input } from '@loopstack/common';

export const OptimizedMeetingNotesDocumentSchema = z.object({
  date: z.string(),
  summary: z.string(),
  participants: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(z.string()),
});

@Document({
  uiConfig: __dirname + '/optimized-notes-document.yaml',
})
export class OptimizedNotesDocument extends BaseDocument implements DocumentInterface {
  @Input({
    schema: OptimizedMeetingNotesDocumentSchema,
  })
  content: z.infer<typeof OptimizedMeetingNotesDocumentSchema>;
}
