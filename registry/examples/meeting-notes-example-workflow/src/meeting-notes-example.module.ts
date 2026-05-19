import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { MeetingNotesDocument } from './documents/meeting-notes-document';
import { OptimizedNotesDocument } from './documents/optimized-notes-document';
import { MeetingNotesWorkflow } from './meeting-notes.workflow';

@Module({
  imports: [ClaudeModule],
  providers: [MeetingNotesWorkflow, MeetingNotesDocument, OptimizedNotesDocument],
  exports: [MeetingNotesWorkflow],
})
export class MeetingNotesExampleModule {}
