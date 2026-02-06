import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, DocumentInterface, WithArguments } from '@loopstack/common';

export const OptimizedMeetingNotesDocumentSchema = z.object({
  date: z.string(),
  summary: z.string(),
  participants: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(z.string()),
});

@Injectable()
@Document({
  configFile: __dirname + '/optimized-notes-document.yaml',
})
@WithArguments(OptimizedMeetingNotesDocumentSchema)
export class OptimizedNotesDocument implements DocumentInterface {}
