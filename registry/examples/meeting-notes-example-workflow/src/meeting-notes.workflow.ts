import { z } from 'zod';
import { toJSONSchema } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import type { LlmGenerateObjectResult } from '@loopstack/llm-provider-module';
import { LlmGenerateObjectTool } from '@loopstack/llm-provider-module';
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
  @InjectTool({ provider: 'claude', model: 'claude-sonnet-4-6' })
  llmGenerateObject: LlmGenerateObjectTool;

  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
  optimizedNotes?: z.infer<typeof OptimizedMeetingNotesDocumentSchema>;

  @Initial({ to: 'waiting_for_response' })
  async createForm(args: { inputText: string }) {
    await this.repository.save(
      MeetingNotesDocument,
      { text: `Unstructured Notes:\n\n${args.inputText}` },
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
    const result = await this.llmGenerateObject.call({
      outputSchema: toJSONSchema(OptimizedMeetingNotesDocumentSchema) as Record<string, unknown>,
      prompt: this.render(__dirname + '/templates/extract-notes.md', { text: this.meetingNotes?.text }),
    });

    const objectResult = result.data as LlmGenerateObjectResult;
    await this.repository.save(
      OptimizedNotesDocument,
      objectResult.data as z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
      {
        id: 'final',
        validate: 'skip',
      },
    );
  }

  @Final({ from: 'notes_optimized', wait: true, schema: OptimizedMeetingNotesDocumentSchema })
  async confirm(payload: z.infer<typeof OptimizedMeetingNotesDocumentSchema>) {
    const result = await this.repository.save(OptimizedNotesDocument, payload, { id: 'final' });
    this.optimizedNotes = result.content as z.infer<typeof OptimizedMeetingNotesDocumentSchema>;
  }
}
