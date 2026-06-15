import { z } from 'zod';
import { BaseWorkflow, CallbackSchema, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

const ShowCallbackSchema = CallbackSchema.extend({
  data: z.object({ message: z.string() }),
});
type ShowCallback = z.infer<typeof ShowCallbackSchema>;

/**
 * Demonstrates every `RunOptions.show` mode in one chained flow:
 *
 * 1. `show: 'inline'` — the child renders as an embedded iframe inside the parent's stream
 *    and auto-collapses once it reaches a terminal state.
 * 2. `show: 'link'` — the child renders as a status link card; clicking opens the child
 *    in a separate window.
 * 3. `show: 'hidden'` — the child runs without any UI in the parent's stream; the callback
 *    still fires normally.
 */
@Workflow({
  title: 'Sub Workflow Show Modes Example',
})
export class RunSubWorkflowExampleShowModesWorkflow extends BaseWorkflow {
  constructor(private readonly sub: RunSubWorkflowExampleSubWorkflow) {
    super();
  }

  @Transition({ to: 'inline_started' })
  async runInline(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.sub.run(
      {},
      { callback: { transition: 'onInlineDone' }, show: 'inline', label: 'Inline embed (iframe)' },
    );
    return state;
  }

  @Transition({
    from: 'inline_started',
    to: 'link_started',
    wait: true,
    schema: ShowCallbackSchema,
  })
  async onInlineDone(state: Record<string, unknown>, payload: ShowCallback): Promise<Record<string, unknown>> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Inline child returned: ${payload.data.message}`,
    });
    await this.sub.run({}, { callback: { transition: 'onLinkDone' }, show: 'link', label: 'Status link card' });
    return state;
  }

  @Transition({
    from: 'link_started',
    to: 'hidden_started',
    wait: true,
    schema: ShowCallbackSchema,
  })
  async onLinkDone(state: Record<string, unknown>, payload: ShowCallback): Promise<Record<string, unknown>> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Link child returned: ${payload.data.message}`,
    });
    await this.sub.run({}, { callback: { transition: 'onHiddenDone' }, show: 'hidden', label: 'Background child' });
    return state;
  }

  @Transition({
    from: 'hidden_started',
    to: 'end',
    wait: true,
    schema: ShowCallbackSchema,
  })
  async onHiddenDone(_state: Record<string, unknown>, payload: ShowCallback): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Hidden child returned: ${payload.data.message} — no LinkCard was rendered for it.`,
    });
    return {};
  }
}
