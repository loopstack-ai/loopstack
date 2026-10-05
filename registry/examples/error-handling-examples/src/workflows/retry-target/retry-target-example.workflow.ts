import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { FlakyServiceTool } from '../../tools/flaky-service.tool';

interface RetryTargetState {
  refreshes: number;
}

/**
 * retryTarget: each auto-retry re-enters the workflow at `refresh_credentials` instead of re-running
 * the failed transition directly. That place does the preparation work (here: a credential refresh)
 * and then loops back to `ready`, where the service call is attempted again.
 */
@Workflow({
  title: 'Error Handling - Retry Target Example',
  description:
    'Auto-retry via a different place: every failed attempt routes through a refresh step before the ' +
    'service call runs again. The third attempt succeeds. No action required.',
})
export class RetryTargetExampleWorkflow extends BaseWorkflow {
  constructor(private readonly flakyService: FlakyServiceTool) {
    super();
  }

  @Transition({ to: 'ready' })
  setup() {
    this.assignState({ refreshes: 0 });
  }

  @Transition({ from: 'ready', to: 'end', retryAttempts: 2, retryTarget: 'refresh_credentials' })
  async callService(state: RetryTargetState, ctx: RunContext) {
    const attempt = ctx.execution!.retryCount + 1;
    await this.flakyService.call({ shouldFail: attempt <= 2 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Service call succeeded on attempt ${attempt}, after ${state.refreshes} credential refresh(es).`,
    });
    this.setResult({ attempts: attempt, refreshes: state.refreshes });
  }

  @Transition({ from: 'refresh_credentials', to: 'ready' })
  async refreshCredentials(state: RetryTargetState) {
    const refreshes = state.refreshes + 1;
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Refreshing credentials (#${refreshes}) before retrying the service call.`,
    });
    this.assignState({ refreshes });
  }
}
