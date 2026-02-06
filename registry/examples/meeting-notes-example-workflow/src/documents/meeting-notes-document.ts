import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, DocumentInterface, WithArguments } from '@loopstack/common';

export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@Injectable()
@Document({
  configFile: __dirname + '/meeting-notes-document.yaml',
})
@WithArguments(MeetingNotesDocumentSchema)
export class MeetingNotesDocument implements DocumentInterface {}
