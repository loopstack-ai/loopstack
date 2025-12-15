import { BlockConfig, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { DocumentBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

export const MeetingNotesDocumentSchema = z.object({
  text: z.string(),
});

@Injectable()
@BlockConfig({
  configFile: __dirname + '/meeting-notes-document.yaml',
})
@WithArguments(MeetingNotesDocumentSchema)
export class MeetingNotesDocument extends DocumentBase {}
