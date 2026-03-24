import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { MeetingNotesDocument } from './documents/meeting-notes-document';
import { OptimizedNotesDocument } from './documents/optimized-notes-document';
import { MeetingNotesWorkflow } from './meeting-notes.workflow';

@Module({
  imports: [LoopCoreModule, AiModule],
  providers: [MeetingNotesWorkflow, MeetingNotesDocument, OptimizedNotesDocument],
  exports: [MeetingNotesWorkflow],
})
export class MeetingNotesExampleModule {}
