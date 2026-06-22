import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { FanOutResultSchema, FanOutWorkflow } from '@loopstack/core';

type FanOutResultData = z.infer<typeof FanOutResultSchema>;

/**
 * Demonstrates `FanOutWorkflow` — launches three sub-workflows in parallel and
 * receives a single aggregated callback once all of them complete.
 */
@Workflow({
  title: 'Fan Out Sub Workflows Example',
})
export class RunSubWorkflowExampleFanOutWorkflow extends BaseWorkflow {
  constructor(private readonly fanOut: FanOutWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting' })
  async launch(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.fanOut.run(
      {
        items: {
          first: { workflow: 'run_sub_workflow_example_sub' },
          second: { workflow: 'run_sub_workflow_example_sub' },
          third: { workflow: 'run_sub_workflow_example_sub' },
        },
      },
      { callback: { transition: 'onAllDone' }, label: 'Fan-out children', show: 'link' },
    );
    return state;
  }

  @Transition({
    from: 'awaiting',
    to: 'end',
    wait: true,
    schema: FanOutResultSchema,
  })
  async onAllDone(state: Record<string, unknown>, input: TransitionInput<FanOutResultData>): Promise<unknown> {
    const results = input.data.results as Record<string, { data?: unknown }>;

    for (const key of Object.keys(results)) {
      const child = results[key];
      const data = (child.data ?? {}) as { message?: string };
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        text: `Fan-out ${key}: ${data.message ?? '(no message)'}`,
      });
    }

    return { hasErrors: input.data.hasErrors, errorCount: input.data.errorCount };
  }
}
