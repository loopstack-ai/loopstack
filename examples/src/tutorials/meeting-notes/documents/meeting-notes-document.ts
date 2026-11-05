import { z } from 'zod';
import { Document } from '@loopstack/common';

export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@Document({
  schema: MeetingNotesDocumentSchema,
  widget: './meeting-notes-document.yaml',
})
export class MeetingNotesDocument {
  text: string;
}
