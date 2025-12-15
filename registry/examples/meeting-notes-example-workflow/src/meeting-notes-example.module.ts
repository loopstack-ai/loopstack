import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { AiModule } from '@loopstack/ai-module';
import { MeetingNotesWorkflow } from './meeting-notes.workflow';
import { MeetingNotesDocument } from './documents/meeting-notes-document';
import { OptimizedNotesDocument } from './documents/optimized-notes-document';

@Module({
  imports: [LoopCoreModule, CoreUiModule, AiModule],
  providers: [
    MeetingNotesWorkflow,
    MeetingNotesDocument,
    OptimizedNotesDocument,
  ],
  exports: [
    MeetingNotesWorkflow,
  ]
})
export class MeetingNotesExampleModule {}
