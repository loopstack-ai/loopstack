import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { LlmGenerateObjectTool } from '@loopstack/llm-provider';
import { MeetingNotesDocument, MeetingNotesDocumentSchema } from './documents/meeting-notes-document';
import { OptimizedMeetingNotesDocumentSchema, OptimizedNotesDocument } from './documents/optimized-notes-document';

interface MeetingNotesState {
  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
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
  title: 'Tutorial - Meeting Notes Example',
  description: 'Structures raw meeting notes using AI, with human review at each step.',
  schema: MeetingNotesArgsSchema,
})
export class MeetingNotesWorkflow extends BaseWorkflow<MeetingNotesArgs> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }

  // Step 1: Display raw notes as an editable form and wait
  @Transition({ to: 'waiting_for_response' })
  async showNotes(state: MeetingNotesState, ctx: RunContext<MeetingNotesArgs>) {
    await this.documentStore.save(MeetingNotesDocument, { text: ctx.args.inputText }, { key: 'input' });
  }

  // Step 2: User clicks "Optimize Notes" — input.data is the edited form content
  @Transition({ from: 'waiting_for_response', to: 'response_received', wait: true, schema: MeetingNotesDocumentSchema })
  async userResponse(state: MeetingNotesState, input: TransitionInput<z.infer<typeof MeetingNotesDocumentSchema>>) {
    // Persist whatever the user may have edited before clicking the button
    const result = await this.documentStore.save(MeetingNotesDocument, input.data, { key: 'input' });
    this.assignState({ meetingNotes: result.content as z.infer<typeof MeetingNotesDocumentSchema> });
  }

  // Step 3: Send notes to LLM, save the structured result
  @Transition({ from: 'response_received', to: 'notes_optimized' })
  async optimizeNotes(state: MeetingNotesState) {
    const result = await this.llmGenerateObject.call(
      {
        // The LLM must return an object that matches this Zod schema
        outputSchema: OptimizedMeetingNotesDocumentSchema,
        prompt: this.render(join(__dirname, 'templates', 'extract-notes.md'), { text: state.meetingNotes?.text }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    await this.documentStore.save(
      OptimizedNotesDocument,
      result.data.data as z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
      { key: 'final' },
    );
  }

  // Step 4: User reviews the structured output and clicks "Confirm"
  @Transition({ from: 'notes_optimized', to: 'end', wait: true, schema: OptimizedMeetingNotesDocumentSchema })
  async confirm(state: MeetingNotesState, input: TransitionInput<z.infer<typeof OptimizedMeetingNotesDocumentSchema>>) {
    // Save final confirmed version and publish it as the workflow output
    const result = await this.documentStore.save(OptimizedNotesDocument, input.data, { key: 'final' });
    this.setResult({ optimizedNotes: result.content });
  }
}
