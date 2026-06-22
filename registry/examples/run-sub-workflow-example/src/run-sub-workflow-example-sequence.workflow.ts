import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { SequenceResultSchema, SequenceWorkflow } from '@loopstack/core';

type SequenceResultData = z.infer<typeof SequenceResultSchema>;

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
    schema: SequenceResultSchema,
  })
  async onComplete(state: Record<string, unknown>, input: TransitionInput<SequenceResultData>): Promise<unknown> {
    const results = input.data.results as Array<{ key: string; data?: unknown }>;

    for (const entry of results) {
      const data = (entry.data ?? {}) as { message?: string };
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        text: `Sequence ${entry.key}: ${data.message ?? '(no message)'}`,
      });
    }

    return { hasErrors: input.data.hasErrors, errorCount: input.data.errorCount };
  }
}
