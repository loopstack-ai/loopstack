import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, WithArguments } from '@loopstack/common';
import { DocumentBase } from '@loopstack/core';

export const OptimizedMeetingNotesDocumentSchema = z.object({
  date: z.string(),
  summary: z.string(),
  participants: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(z.string()),
});

@Injectable()
@BlockConfig({
  configFile: __dirname + '/optimized-notes-document.yaml',
})
@WithArguments(OptimizedMeetingNotesDocumentSchema)
export class OptimizedNotesDocument extends DocumentBase {}
