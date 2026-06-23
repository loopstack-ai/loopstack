import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { LlmGenerateObjectTool } from '@loopstack/llm-provider-module';
import { MeetingNotesDocument, MeetingNotesDocumentSchema } from './documents/meeting-notes-document';
import { OptimizedMeetingNotesDocumentSchema, OptimizedNotesDocument } from './documents/optimized-notes-document';

interface MeetingNotesState {
  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
  optimizedNotes?: z.infer<typeof OptimizedMeetingNotesDocumentSchema>;
}

const MeetingNotesArgsSchema = z.object({
  inputText: z
    .string()
    .default(
      '- meeting 1.1.2025\n- budget: need 2 cut costs sarah said\n- hire new person?? --> marketing\n- vendor pricing - follow up needed by anna',
    ),
});

type MeetingNotesArgs = z.infer<typeof MeetingNotesArgsSchema>;

@Workflow({
  title: 'Human-in-the-loop Demo (Meeting Notes Optimizer)',
  description: 'A demo workflow to demonstrate how to use AI to structure meeting notes.',
  schema: MeetingNotesArgsSchema,
})
export class MeetingNotesWorkflow extends BaseWorkflow<MeetingNotesArgs> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }

  @Transition({ to: 'waiting_for_response' })
  async createForm(state: MeetingNotesState, ctx: RunContext<MeetingNotesArgs>) {
    await this.documentStore.save(
      MeetingNotesDocument,
      { text: `Unstructured Notes:\n\n${ctx.args.inputText}` },
      { key: 'input' },
    );
  }

  @Transition({ from: 'waiting_for_response', to: 'response_received', wait: true, schema: MeetingNotesDocumentSchema })
  async userResponse(state: MeetingNotesState, input: TransitionInput<z.infer<typeof MeetingNotesDocumentSchema>>) {
    const result = await this.documentStore.save(MeetingNotesDocument, input.data, { key: 'input' });
    this.assignState({ meetingNotes: result.content as z.infer<typeof MeetingNotesDocumentSchema> });
  }

  @Transition({ from: 'response_received', to: 'notes_optimized' })
  async optimizeNotes(state: MeetingNotesState) {
    const result = await this.llmGenerateObject.call(
      {
        outputSchema: OptimizedMeetingNotesDocumentSchema,
        prompt: this.render(join(__dirname, 'templates', 'extract-notes.md'), {
          text: state.meetingNotes?.text,
        }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    await this.documentStore.save(
      OptimizedNotesDocument,
      result.data.data as z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
      { key: 'final' },
    );
  }

  @Transition({ from: 'notes_optimized', to: 'end', wait: true, schema: OptimizedMeetingNotesDocumentSchema })
  async confirm(state: MeetingNotesState, input: TransitionInput<z.infer<typeof OptimizedMeetingNotesDocumentSchema>>) {
    const result = await this.documentStore.save(OptimizedNotesDocument, input.data, { key: 'final' });
    this.setResult({
      optimizedNotes: result.content as z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
    } as unknown as Record<string, unknown>);
  }
}
