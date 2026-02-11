import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@Document({
  configFile: __dirname + '/meeting-notes-document.yaml',
})
export class MeetingNotesDocument implements DocumentInterface {
  @Input({
    schema: MeetingNotesDocumentSchema,
  })
  content: {
    text: string;
  };
}
