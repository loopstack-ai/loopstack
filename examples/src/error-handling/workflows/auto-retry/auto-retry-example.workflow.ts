import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { FlakyServiceTool } from '../../tools/flaky-service.tool';

/**
 * Auto-retry: `retryAttempts: 2` re-runs a failed transition automatically with exponential
 * backoff (1s, then 2s). The service fails on the first two attempts and succeeds on the third.
 */
@Workflow({
  title: 'Error Handling - Auto Retry Example',
  description:
    'Auto-retry with exponential backoff: the service call fails twice and the framework re-runs the ' +
    'transition until the third attempt succeeds. No action required.',
})
export class AutoRetryExampleWorkflow extends BaseWorkflow {
  constructor(private readonly flakyService: FlakyServiceTool) {
    super();
  }

  @Transition({ to: 'end', retryAttempts: 2 })
  async callService(_state: Record<string, unknown>, ctx: RunContext) {
    const attempt = ctx.execution!.retryCount + 1;
    await this.flakyService.call({ shouldFail: attempt <= 2 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Service call succeeded on attempt ${attempt}.`,
    });
    this.setResult({ attempts: attempt });
  }
}
