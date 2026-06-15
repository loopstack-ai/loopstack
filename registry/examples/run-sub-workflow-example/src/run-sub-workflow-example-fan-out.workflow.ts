import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { type FanOutCallbackPayload, FanOutCallbackSchema, FanOutWorkflow } from '@loopstack/core';

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
    schema: FanOutCallbackSchema,
  })
  async onAllDone(state: Record<string, unknown>, payload: FanOutCallbackPayload): Promise<unknown> {
    const results = payload.data.results as Record<string, { data?: unknown }>;

    for (const key of Object.keys(results)) {
      const child = results[key];
      const data = (child.data ?? {}) as { message?: string };
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        text: `Fan-out ${key}: ${data.message ?? '(no message)'}`,
      });
    }

    return { hasErrors: payload.data.hasErrors, errorCount: payload.data.errorCount };
  }
}
