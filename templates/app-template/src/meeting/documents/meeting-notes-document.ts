import { z } from 'zod';
import { BaseDocument, Document, DocumentInterface, Input } from '@loopstack/common';

export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@Document({
  uiConfig: __dirname + '/meeting-notes-document.yaml',
})
export class MeetingNotesDocument extends BaseDocument implements DocumentInterface {
  @Input({
    schema: MeetingNotesDocumentSchema,
  })
  content: {
    text: string;
  };
}
