import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, WithArguments } from '@loopstack/common';
import { DocumentBase } from '@loopstack/core';

export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@Injectable()
@BlockConfig({
  configFile: __dirname + '/meeting-notes-document.yaml',
})
@WithArguments(MeetingNotesDocumentSchema)
export class MeetingNotesDocument extends DocumentBase {}
