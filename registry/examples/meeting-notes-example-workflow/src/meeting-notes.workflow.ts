import { z } from 'zod';
import { ClaudeGenerateDocument } from '@loopstack/claude-module';
import { BaseWorkflow, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { MeetingNotesDocument, MeetingNotesDocumentSchema } from './documents/meeting-notes-document';
import { OptimizedMeetingNotesDocumentSchema, OptimizedNotesDocument } from './documents/optimized-notes-document';

@Workflow({
  uiConfig: __dirname + '/meeting-notes.ui.yaml',
  schema: z.object({
    inputText: z
      .string()
      .default(
        '- meeting 1.1.2025\n- budget: need 2 cut costs sarah said\n- hire new person?? --> marketing\n- vendor pricing - follow up needed by anna',
      ),
  }),
})
export class MeetingNotesWorkflow extends BaseWorkflow<{ inputText: string }> {
  @InjectTool() claudeGenerateDocument: ClaudeGenerateDocument;

  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
  optimizedNotes?: z.infer<typeof OptimizedMeetingNotesDocumentSchema>;

  @Initial({ to: 'waiting_for_response' })
  async createForm(args: { inputText: string }) {
    await this.repository.save(
      MeetingNotesDocument,
      {
        text: `Unstructured Notes:\n\n${args.inputText}`,
      },
      { id: 'input' },
    );
  }

  @Transition({ from: 'waiting_for_response', to: 'response_received', wait: true, schema: MeetingNotesDocumentSchema })
  async userResponse(payload: z.infer<typeof MeetingNotesDocumentSchema>) {
    const result = await this.repository.save(MeetingNotesDocument, payload, { id: 'input' });
    this.meetingNotes = result.content as z.infer<typeof MeetingNotesDocumentSchema>;
  }

  @Transition({ from: 'response_received', to: 'notes_optimized' })
  async optimizeNotes() {
    await this.claudeGenerateDocument.call({
      claude: { model: 'claude-sonnet-4-6' },
      response: {
        id: 'final',
        document: OptimizedNotesDocument,
      },
      prompt: `Extract all information from the provided meeting notes into the structured document.

<Meeting Notes>
${this.meetingNotes?.text}
</Meeting Notes>`,
    });
  }

  @Final({ from: 'notes_optimized', wait: true, schema: OptimizedMeetingNotesDocumentSchema })
  async confirm(payload: z.infer<typeof OptimizedMeetingNotesDocumentSchema>) {
    const result = await this.repository.save(OptimizedNotesDocument, payload, { id: 'final' });
    this.optimizedNotes = result.content as z.infer<typeof OptimizedMeetingNotesDocumentSchema>;
  }
}
