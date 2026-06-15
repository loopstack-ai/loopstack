import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { type SequenceCallbackPayload, SequenceCallbackSchema, SequenceWorkflow } from '@loopstack/core';

/**
 * Demonstrates `SequenceWorkflow` — runs three sub-workflows one at a time and
 * receives a single aggregated callback after the last one completes.
 */
@Workflow({
  title: 'Sequence Sub Workflows Example',
})
export class RunSubWorkflowExampleSequenceWorkflow extends BaseWorkflow {
  constructor(private readonly sequence: SequenceWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting' })
  async launch(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.sequence.run(
      {
        items: [
          { workflow: 'run_sub_workflow_example_sub', label: 'step-1' },
          { workflow: 'run_sub_workflow_example_sub', label: 'step-2' },
          { workflow: 'run_sub_workflow_example_sub', label: 'step-3' },
        ],
      },
      { callback: { transition: 'onComplete' }, label: 'Sequence children', show: 'link' },
    );
    return state;
  }

  @Transition({
    from: 'awaiting',
    to: 'end',
    wait: true,
    schema: SequenceCallbackSchema,
  })
  async onComplete(state: Record<string, unknown>, payload: SequenceCallbackPayload): Promise<unknown> {
    const results = payload.data.results as Array<{ key: string; data?: unknown }>;

    for (const entry of results) {
      const data = (entry.data ?? {}) as { message?: string };
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        text: `Sequence ${entry.key}: ${data.message ?? '(no message)'}`,
      });
    }

    return { hasErrors: payload.data.hasErrors, errorCount: payload.data.errorCount };
  }
}
