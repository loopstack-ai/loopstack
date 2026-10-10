import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { ClaudeModule } from '@loopstack/claude-module';
import { StudioApp } from '@loopstack/common';
import { HitlModule } from '@loopstack/hitl';
import { AgentAskClarificationExampleWorkflow } from './workflows/agent-ask-clarification/agent-ask-clarification-example.workflow';
import { AgentAskForApprovalExampleWorkflow } from './workflows/agent-ask-for-approval/agent-ask-for-approval-example.workflow';
import { AskUserConfirmExampleWorkflow } from './workflows/ask-user-confirm/ask-user-confirm-example.workflow';
import { AskUserOptionsExampleWorkflow } from './workflows/ask-user-options/ask-user-options-example.workflow';
import { AskUserTextExampleWorkflow } from './workflows/ask-user-text/ask-user-text-example.workflow';
import { ConfirmContentExampleWorkflow } from './workflows/confirm-content/confirm-content-example.workflow';
import { FeedbackFormDocument } from './workflows/inline-form/feedback-form-document';
import { InlineFormExampleWorkflow } from './workflows/inline-form/inline-form-example.workflow';
import { MeetingNotesDocument } from './workflows/meeting-notes/documents/meeting-notes-document';
import { OptimizedNotesDocument } from './workflows/meeting-notes/documents/optimized-notes-document';
import { MeetingNotesExampleWorkflow } from './workflows/meeting-notes/meeting-notes-example.workflow';
import { PromptInputChatExampleWorkflow } from './workflows/prompt-input-chat/prompt-input-chat-example.workflow';

const WORKFLOWS = [
  InlineFormExampleWorkflow,
  PromptInputChatExampleWorkflow,
  AskUserTextExampleWorkflow,
  AskUserOptionsExampleWorkflow,
  AskUserConfirmExampleWorkflow,
  ConfirmContentExampleWorkflow,
  AgentAskClarificationExampleWorkflow,
  AgentAskForApprovalExampleWorkflow,
  MeetingNotesExampleWorkflow,
];

@StudioApp({
  title: 'HITL Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [HitlModule, AgentModule, ClaudeModule],
  providers: [FeedbackFormDocument, MeetingNotesDocument, OptimizedNotesDocument, ...WORKFLOWS],
  exports: WORKFLOWS,
})
export class HitlExamplesModule {}
