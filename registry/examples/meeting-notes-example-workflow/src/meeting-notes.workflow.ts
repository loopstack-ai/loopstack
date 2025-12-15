import { WorkflowBase } from '@loopstack/core';
import { BlockConfig, Document, Tool, WithArguments, WithState } from '@loopstack/common';
import { MeetingNotesDocument, MeetingNotesDocumentSchema } from './documents/meeting-notes-document';
import { OptimizedMeetingNotesDocumentSchema, OptimizedNotesDocument } from './documents/optimized-notes-document';
import { z } from 'zod';
import { AiGenerateDocument } from '@loopstack/ai-module';
import { CreateDocument } from '@loopstack/core-ui-module';

@BlockConfig({
  configFile: __dirname + '/meeting-notes.workflow.yaml',
})
@WithArguments(z.object({
  inputText: z.string().default("- meeting 1.1.2025\n- budget: need 2 cut costs sarah said\n- hire new person?? --> marketing\n- vendor pricing - follow up needed by anna"),
}))
@WithState(z.object({
  meetingNotes: MeetingNotesDocumentSchema.optional(),
  optimizedNotes: OptimizedMeetingNotesDocumentSchema.optional(),
}))
export class MeetingNotesWorkflow extends WorkflowBase {
  @Tool() aiGenerateDocument: AiGenerateDocument;
  @Tool() createDocument: CreateDocument;
  @Document() meetingNotesDocument: MeetingNotesDocument;
  @Document() optimizedNotesDocument: OptimizedNotesDocument;
}