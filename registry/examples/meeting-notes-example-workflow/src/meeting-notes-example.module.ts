import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { MeetingNotesDocument } from './documents/meeting-notes-document.js';
import { OptimizedNotesDocument } from './documents/optimized-notes-document.js';
import { MeetingNotesWorkflow } from './meeting-notes.workflow.js';

@Module({
  imports: [ClaudeModule],
  providers: [MeetingNotesWorkflow, MeetingNotesDocument, OptimizedNotesDocument],
  exports: [MeetingNotesWorkflow],
})
export class MeetingNotesExampleModule {}
