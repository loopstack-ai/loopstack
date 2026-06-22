import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { RunSubWorkflowExampleFailingSubWorkflow } from './run-sub-workflow-example-failing-sub.workflow';

/**
 * Launches the failing sub-workflow in both `show: 'inline'` and `show: 'link'` modes so the
 * error UI can be inspected in each. The parent branches on `input.hasError` and surfaces
 * `input.errorMessage` to demonstrate that the envelope carries the failure context — no
 * need to query the child entity separately.
 */
@Workflow({
  title: 'Sub Workflow Error Handling Example',
})
export class RunSubWorkflowExampleErrorHandlingWorkflow extends BaseWorkflow {
  constructor(private readonly failingSub: RunSubWorkflowExampleFailingSubWorkflow) {
    super();
  }

  @Transition({ to: 'inline_awaiting' })
  async launchInline(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.failingSub.run(
      {},
      { callback: { transition: 'onInlineFinished' }, show: 'inline', label: 'Failing sub-workflow (inline)' },
    );
    return state;
  }

  @Transition({
    from: 'inline_awaiting',
    to: 'link_awaiting',
    wait: true,
  })
  async onInlineFinished(state: Record<string, unknown>, input: TransitionInput): Promise<Record<string, unknown>> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: input.hasError
        ? `Inline child failed (status="${input.status}"): ${input.errorMessage ?? 'unknown error'}. Trying the same failing child with show: 'link' next.`
        : `Inline child finished normally (status="${input.status}").`,
    });
    await this.failingSub.run(
      {},
      { callback: { transition: 'onLinkFinished' }, show: 'link', label: 'Failing sub-workflow (link)' },
    );
    return state;
  }

  @Transition({
    from: 'link_awaiting',
    to: 'end',
    wait: true,
  })
  async onLinkFinished(_state: Record<string, unknown>, input: TransitionInput): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: input.hasError
        ? `Link child failed (status="${input.status}"): ${input.errorMessage ?? 'unknown error'}. The parent recovered gracefully.`
        : `Link child finished normally (status="${input.status}").`,
    });
    return { childStatus: input.status, childErrorMessage: input.errorMessage };
  }
}
