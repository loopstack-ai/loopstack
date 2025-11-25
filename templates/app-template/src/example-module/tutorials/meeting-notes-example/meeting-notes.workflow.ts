import { Expose } from 'class-transformer';
import { CreateDocument, Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/common';
import { AiGenerateDocument } from '@loopstack/llm';
import { MeetingNotesDocument } from './documents/meeting-notes-document';
import { OptimizedNotesDocument } from './documents/optimized-notes-document';
import { z } from 'zod';

@BlockConfig({
  imports: [
    AiGenerateDocument,
    CreateDocument,
    MeetingNotesDocument,
    OptimizedNotesDocument,
  ],
  properties: z.object({
    inputText: z.string().default("- meeting 1.1.2025\n- budget: need 2 cut costs sarah said\n- hire new person?? --> marketing\n- vendor pricing - follow up needed by anna"),
  }),
  configFile: __dirname + '/meeting-notes.workflow.yaml',
})
export class MeetingNotesWorkflow extends Workflow {
  @Input()
  @Expose()
  meetingNotes: MeetingNotesDocument;

  @Input()
  @Expose()
  optimizedNotes: OptimizedNotesDocument;
}