import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude';
import { StudioApp } from '@loopstack/common';
import { MeetingNotesWorkflow } from './meeting-notes/meeting-notes.workflow';

@StudioApp({
  title: 'Tutorial Examples',
  workflows: [MeetingNotesWorkflow],
})
@Module({
  imports: [ClaudeModule],
  providers: [MeetingNotesWorkflow],
  exports: [MeetingNotesWorkflow],
})
export class TutorialsExamplesModule {}
