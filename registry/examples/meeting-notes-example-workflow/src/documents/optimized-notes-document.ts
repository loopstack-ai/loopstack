import { z } from 'zod';
import { Document } from '@loopstack/common';

export const OptimizedMeetingNotesDocumentSchema = z.object({
  date: z.string(),
  summary: z.string(),
  participants: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(z.string()),
});

@Document({
  schema: OptimizedMeetingNotesDocumentSchema,
  uiConfig: __dirname + '/optimized-notes-document.yaml',
})
export class OptimizedNotesDocument {
  date: string;
  summary: string;
  participants: string[];
  decisions: string[];
  actionItems: string[];
}
