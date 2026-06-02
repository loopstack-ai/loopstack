import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { toJSONSchema } from 'zod';
import { BaseWorkflow, DOCUMENT_STORE, TEMPLATE_RENDERER, Transition, Workflow } from '@loopstack/common';
import type { DocumentStore, LoopstackContext, TemplateRenderFn } from '@loopstack/common';
import type { LlmGenerateObjectResult } from '@loopstack/llm-provider-module';
import { LlmGenerateObjectTool } from '@loopstack/llm-provider-module';
import { MeetingNotesDocument, MeetingNotesDocumentSchema } from './documents/meeting-notes-document';
import { OptimizedMeetingNotesDocumentSchema, OptimizedNotesDocument } from './documents/optimized-notes-document';

interface MeetingNotesState {
  meetingNotes?: z.infer<typeof MeetingNotesDocumentSchema>;
  optimizedNotes?: z.infer<typeof OptimizedMeetingNotesDocumentSchema>;
}

@Workflow({
  title: 'Human-in-the-loop Demo (Meeting Notes Optimizer)',
  description: 'A demo workflow to demonstrate how to use AI to structure meeting notes.',
  schema: z.object({
    inputText: z
      .string()
      .default(
        '- meeting 1.1.2025\n- budget: need 2 cut costs sarah said\n- hire new person?? --> marketing\n- vendor pricing - follow up needed by anna',
      ),
  }),
})
export class MeetingNotesWorkflow extends BaseWorkflow<{ inputText: string }, MeetingNotesState> {
  constructor(
    private readonly llmGenerateObject: LlmGenerateObjectTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'waiting_for_response' })
  async createForm(state: MeetingNotesState, ctx: LoopstackContext): Promise<MeetingNotesState> {
    const args = ctx.args as { inputText: string };
    await this.documentStore.save(
      MeetingNotesDocument,
      { text: `Unstructured Notes:\n\n${args.inputText}` },
      { id: 'input' },
    );
    return state;
  }

  @Transition({ from: 'waiting_for_response', to: 'response_received', wait: true, schema: MeetingNotesDocumentSchema })
  async userResponse(
    state: MeetingNotesState,
    payload: z.infer<typeof MeetingNotesDocumentSchema>,
  ): Promise<MeetingNotesState> {
    const result = await this.documentStore.save(MeetingNotesDocument, payload, { id: 'input' });
    return { ...state, meetingNotes: result.content as z.infer<typeof MeetingNotesDocumentSchema> };
  }

  @Transition({ from: 'response_received', to: 'notes_optimized' })
  async optimizeNotes(state: MeetingNotesState): Promise<MeetingNotesState> {
    const result = await this.llmGenerateObject.call(
      {
        outputSchema: toJSONSchema(OptimizedMeetingNotesDocumentSchema) as Record<string, unknown>,
        prompt: this.render(__dirname + '/templates/extract-notes.md', {
          text: state.meetingNotes?.text,
        }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    const objectResult = result.data as LlmGenerateObjectResult;
    await this.documentStore.save(
      OptimizedNotesDocument,
      objectResult.data as z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
      {
        id: 'final',
        validate: 'skip',
      },
    );
    return state;
  }

  @Transition({ from: 'notes_optimized', to: 'end', wait: true, schema: OptimizedMeetingNotesDocumentSchema })
  async confirm(
    state: MeetingNotesState,
    payload: z.infer<typeof OptimizedMeetingNotesDocumentSchema>,
  ): Promise<unknown> {
    const result = await this.documentStore.save(OptimizedNotesDocument, payload, { id: 'final' });
    return { optimizedNotes: result.content as z.infer<typeof OptimizedMeetingNotesDocumentSchema> };
  }
}
