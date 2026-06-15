import { z } from 'zod';
import { BaseWorkflow, CallbackSchema, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { RunSubWorkflowExampleFailingSubWorkflow } from './run-sub-workflow-example-failing-sub.workflow';

type FailingCallback = z.infer<typeof CallbackSchema>;

/**
 * Launches the failing sub-workflow in both `show: 'inline'` and `show: 'link'` modes so the
 * error UI can be inspected in each. The parent branches on `payload.hasError` and surfaces
 * `payload.errorMessage` to demonstrate that the callback carries the failure context — no
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
    schema: CallbackSchema,
  })
  async onInlineFinished(state: Record<string, unknown>, payload: FailingCallback): Promise<Record<string, unknown>> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: payload.hasError
        ? `Inline child failed (status="${payload.status}"): ${payload.errorMessage ?? 'unknown error'}. Trying the same failing child with show: 'link' next.`
        : `Inline child finished normally (status="${payload.status}").`,
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
    schema: CallbackSchema,
  })
  async onLinkFinished(_state: Record<string, unknown>, payload: FailingCallback): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: payload.hasError
        ? `Link child failed (status="${payload.status}"): ${payload.errorMessage ?? 'unknown error'}. The parent recovered gracefully.`
        : `Link child finished normally (status="${payload.status}").`,
    });
    return { childStatus: payload.status, childErrorMessage: payload.errorMessage };
  }
}
