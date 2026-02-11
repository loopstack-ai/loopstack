import { z } from 'zod';
import { AiGenerateDocument } from '@loopstack/ai-module';
import { InjectDocument, InjectTool, Input, Runtime, State, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';
import { MeetingNotesDocument, MeetingNotesDocumentSchema } from './documents/meeting-notes-document';
import { OptimizedMeetingNotesDocumentSchema, OptimizedNotesDocument } from './documents/optimized-notes-document';

@Workflow({
  configFile: __dirname + '/meeting-notes.workflow.yaml',
})
export class MeetingNotesWorkflow {
  @InjectTool() aiGenerateDocument: AiGenerateDocument;
  @InjectTool() createDocument: CreateDocument;
  @InjectDocument() meetingNotesDocument: MeetingNotesDocument;
  @InjectDocument() optimizedNotesDocument: OptimizedNotesDocument;

  @Input({
    schema: z.object({
      inputText: z
        .string()
        .default(
          '- meeting 1.1.2025\n- budget: need 2 cut costs sarah said\n- hire new person?? --> marketing\n- vendor pricing - follow up needed by anna',
        ),
    }),
  })
  args: {
    inputText: string;
  };

  @State({
    schema: z.object({
      meetingNotes: MeetingNotesDocumentSchema.optional(),
      optimizedNotes: OptimizedMeetingNotesDocumentSchema.optional(),
    }),
  })
  state: {
    meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
    optimizedNotes?: z.infer<typeof OptimizedMeetingNotesDocumentSchema>;
  };

  @Runtime()
  runtime: any;
}
