import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { SlowOperationTool } from '../../tools/slow-operation.tool';

/**
 * Transition timeout: `timeout: 2000` fails the transition when it runs longer than 2 seconds.
 * The first attempt takes 5 seconds and times out; the failure is handled like any other
 * (here: manual retry), and the second attempt finishes instantly.
 */
@Workflow({
  title: 'Error Handling - Transition Timeout Example',
  description:
    'Transition timeout: a 5-second operation exceeds the 2-second timeout and fails. ' +
    'Click the Retry button — the second attempt is instant and succeeds.',
})
export class TransitionTimeoutExampleWorkflow extends BaseWorkflow {
  constructor(private readonly slowOperation: SlowOperationTool) {
    super();
  }

  @Transition({ to: 'end', timeout: 2000 })
  async runSlowOperation(_state: Record<string, unknown>, ctx: RunContext) {
    const attempt = ctx.execution!.retryCount + 1;
    await this.slowOperation.call({ delayMs: attempt <= 1 ? 5000 : 0 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Operation finished within the timeout on attempt ${attempt}.`,
    });
    this.setResult({ attempts: attempt });
  }
}
