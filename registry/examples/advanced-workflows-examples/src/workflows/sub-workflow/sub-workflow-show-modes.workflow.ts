import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { RunSubWorkflowExampleSubWorkflow } from './sub-workflow-sub.workflow';

const ShowMessageSchema = z.object({ message: z.string() });

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
  title: 'Advanced - Sub-Workflow Show Modes Example',
})
export class RunSubWorkflowExampleShowModesWorkflow extends BaseWorkflow {
  constructor(private readonly sub: RunSubWorkflowExampleSubWorkflow) {
    super();
  }

  @Transition({ to: 'inline_started' })
  async runInline(_state: Record<string, unknown>) {
    await this.sub.run(
      {},
      { callback: { transition: 'onInlineDone' }, show: 'inline', label: 'Inline embed (iframe)' },
    );
  }

  @Transition({
    from: 'inline_started',
    to: 'link_started',
    wait: true,
    schema: ShowMessageSchema,
  })
  async onInlineDone(state: Record<string, unknown>, input: TransitionInput<{ message: string }>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Inline child returned: ${input.data.message}`,
    });
    await this.sub.run({}, { callback: { transition: 'onLinkDone' }, show: 'link', label: 'Status link card' });
  }

  @Transition({
    from: 'link_started',
    to: 'hidden_started',
    wait: true,
    schema: ShowMessageSchema,
  })
  async onLinkDone(state: Record<string, unknown>, input: TransitionInput<{ message: string }>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Link child returned: ${input.data.message}`,
    });
    await this.sub.run({}, { callback: { transition: 'onHiddenDone' }, show: 'hidden', label: 'Background child' });
  }

  @Transition({
    from: 'hidden_started',
    to: 'end',
    wait: true,
    schema: ShowMessageSchema,
  })
  async onHiddenDone(_state: Record<string, unknown>, input: TransitionInput<{ message: string }>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Hidden child returned: ${input.data.message} — no LinkCard was rendered for it.`,
    });
  }
}
