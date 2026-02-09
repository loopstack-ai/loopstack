import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Document, DocumentInterface, Input } from '@loopstack/common';

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
export class OptimizedNotesDocument implements DocumentInterface {
  @Input({
    schema: OptimizedMeetingNotesDocumentSchema,
  })
  content: z.infer<typeof OptimizedMeetingNotesDocumentSchema>;
}
