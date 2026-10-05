import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { FlakyServiceTool } from '../../tools/flaky-service.tool';

/**
 * Manual retry (the default): a transition without `retryAttempts` or `errorPlace` that fails keeps
 * the workflow at its current place and offers a Retry button. The service fails on the first
 * attempt only, so one Retry completes the run.
 */
@Workflow({
  title: 'Error Handling - Manual Retry Example',
  description:
    'Manual retry: the service call fails once and the workflow waits at its place. ' +
    'Click the Retry button next to the error to re-run the failed transition.',
})
export class ManualRetryExampleWorkflow extends BaseWorkflow {
  constructor(private readonly flakyService: FlakyServiceTool) {
    super();
  }

  @Transition({ to: 'end' })
  async callService(_state: Record<string, unknown>, ctx: RunContext) {
    const attempt = ctx.execution!.retryCount + 1;
    await this.flakyService.call({ shouldFail: attempt <= 1 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Service call succeeded on attempt ${attempt}.`,
    });
    this.setResult({ attempts: attempt });
  }
}
