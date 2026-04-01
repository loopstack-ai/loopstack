import { z } from 'zod';
import { ClaudeGenerateDocument } from '@loopstack/claude-module';
import {
  Final,
  Initial,
  InjectDocument,
  InjectTool,
  Input,
  Transition,
  Workflow,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import { MeetingNotesDocument, MeetingNotesDocumentSchema } from './documents/meeting-notes-document';
import { OptimizedMeetingNotesDocumentSchema, OptimizedNotesDocument } from './documents/optimized-notes-document';

@Workflow({
  uiConfig: __dirname + '/meeting-notes.workflow.yaml',
})
export class MeetingNotesWorkflow {
  @InjectTool() claudeGenerateDocument: ClaudeGenerateDocument;
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

  private runtime: WorkflowMetadataInterface;

  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
  optimizedNotes?: z.infer<typeof OptimizedMeetingNotesDocumentSchema>;

  @Initial({ to: 'waiting_for_response' })
  async createForm() {
    await this.meetingNotesDocument.create({
      id: 'input',
      content: {
        text: `Unstructured Notes:\n\n${this.args.inputText}`,
      },
    });
  }

  @Transition({ from: 'waiting_for_response', to: 'response_received', wait: true })
  async userResponse() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload: z.infer<typeof MeetingNotesDocumentSchema> = this.runtime.transition.payload;
    const result = await this.meetingNotesDocument.create({
      id: 'input',
      content: payload,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.meetingNotes = result.content;
  }

  @Transition({ from: 'response_received', to: 'notes_optimized' })
  async optimizeNotes() {
    await this.claudeGenerateDocument.run({
      claude: { model: 'claude-sonnet-4-6' },
      response: {
        id: 'final',
        document: 'optimizedNotesDocument',
      },
      prompt: `Extract all information from the provided meeting notes into the structured document.

<Meeting Notes>
${this.meetingNotes?.text}
</Meeting Notes>`,
    });
  }

  @Final({ from: 'notes_optimized', wait: true })
  async confirm() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload: z.infer<typeof OptimizedMeetingNotesDocumentSchema> = this.runtime.transition.payload;
    const result = await this.optimizedNotesDocument.create({
      id: 'final',
      content: payload,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.optimizedNotes = result.content;
  }
}
