import { Expose } from 'class-transformer';
import { CreateDocument, Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/shared';
import { AiGenerateDocument } from '@loopstack/llm';
import { MeetingNotesDocument } from './documents/meeting-notes-document';
import { OptimizedNotesDocument } from './documents/optimized-notes-document';

@BlockConfig({
  imports: [
    AiGenerateDocument,
    CreateDocument,
    MeetingNotesDocument,
    OptimizedNotesDocument,
  ],
  config: {
    title: 'Tutorial 1: Meeting Notes',
  },
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