import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { MeetingNotesDocument } from './documents/meeting-notes-document';
import { OptimizedNotesDocument } from './documents/optimized-notes-document';
import { MeetingNotesWorkflow } from './meeting-notes.workflow';

@Module({
  imports: [CoreUiModule, AiModule],
  providers: [MeetingNotesWorkflow, MeetingNotesDocument, OptimizedNotesDocument],
  exports: [MeetingNotesWorkflow],
})
export class MeetingNotesExampleModule {}
