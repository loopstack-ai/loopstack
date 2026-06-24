import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { SequenceResultSchema, SequenceWorkflow } from '@loopstack/core';

type SequenceResultData = z.infer<typeof SequenceResultSchema>;

/**
 * Demonstrates `SequenceWorkflow` — runs three sub-workflows one at a time and
 * receives a single aggregated callback after the last one completes.
 */
@Workflow({
  title: 'Advanced - Sequence Example',
  description:
    'Runs multiple sub-workflows sequentially via SequenceWorkflow and aggregates results in a single callback.',
})
export class RunSubWorkflowExampleSequenceWorkflow extends BaseWorkflow {
  constructor(private readonly sequence: SequenceWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting' })
  async launch(_state: Record<string, unknown>) {
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
  }

  @Transition({
    from: 'awaiting',
    to: 'end',
    wait: true,
    schema: SequenceResultSchema,
  })
  async onComplete(state: Record<string, unknown>, input: TransitionInput<SequenceResultData>) {
    const results = input.data.results as Array<{ key: string; data?: unknown }>;

    for (const entry of results) {
      const data = (entry.data ?? {}) as { message?: string };
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        text: `Sequence ${entry.key}: ${data.message ?? '(no message)'}`,
      });
    }

    this.setResult({ hasErrors: input.data.hasErrors, errorCount: input.data.errorCount } as unknown as Record<
      string,
      unknown
    >);
  }
}
