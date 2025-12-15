import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';

export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@BlockConfig({
  configFile: __dirname + '/meeting-notes-document.yaml',
})
@WithArguments(MeetingNotesDocumentSchema)
export class MeetingNotesDocument extends DocumentBase {}
