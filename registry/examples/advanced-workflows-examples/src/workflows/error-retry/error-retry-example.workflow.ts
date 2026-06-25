import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { ErrorRetryFailingChildWorkflow } from './failing-child.workflow';
import { SlowTool } from './tools/slow.tool';
import { Step1Tool } from './tools/step1.tool';
import { Step2Tool } from './tools/step2.tool';

interface ErrorRetryState {
  autoRetryAttempts: number;
  manualRetryAttempts: number;
  timeoutAttempts: number;
  retryTargetAttempts: number;
  retryTargetPreps: number;
}

/**
 * Demonstrates all retry/error modes in sequence:
 *
 * Title: 'Advanced - Error Retry Example'
 *
 * Step 1: Auto-retry — fails twice, auto-retries handle it, succeeds on 3rd.
 * Step 2: Manual retry — fails once, user clicks Retry, succeeds.
 * Step 3: Custom error place — always fails, transitions to error_custom for recovery.
 * Step 4: Timeout — slow operation times out, user clicks Retry, fast attempt succeeds.
 * Step 5: Hybrid (auto-retry + custom place) — always fails, auto-retries once, then error_hybrid.
 * Step 6: retryTarget — auto-retries route through a recovery place that "prepares" then loops back.
 * Step 7: Sub-workflow errorPlace — child always fails; parent routes the failure callback to a recovery place.
 */
@Workflow({
  title: 'Advanced - Error Retry Example',
  description:
    'Demonstrates seven retry/error modes: auto-retry with exponential backoff, manual retry via Retry button, ' +
    'custom error place with recovery transition, timeout with manual retry, hybrid (auto-retry + custom error place), ' +
    'retryTarget (auto-retry via a different place), and sub-workflow failure callback routed via errorPlace.',
  widget: './error-retry-example.ui.yaml',
})
export class ErrorRetryWorkflow extends BaseWorkflow {
  constructor(
    private readonly step1Tool: Step1Tool,
    private readonly step2Tool: Step2Tool,
    private readonly slowTool: SlowTool,
    private readonly failingChild: ErrorRetryFailingChildWorkflow,
  ) {
    super();
  }

  @Transition({ to: 'step1_done' })
  async setup(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: '# Error Retry Example\n\nThis workflow tests seven retry/error modes in sequence.',
    });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text:
        '## Step 1: Auto-retry\n\n' +
        'The next step will fail twice. The framework auto-retries with exponential backoff ' +
        '(1s, then 2s). On the 3rd attempt it succeeds.\n\n' +
        '**No action required — just watch.**',
    });
    this.assignState({
      autoRetryAttempts: 0,
      manualRetryAttempts: 0,
      timeoutAttempts: 0,
      retryTargetAttempts: 0,
      retryTargetPreps: 0,
    });
  }

  // -- Step 1: Auto-retry --
  @Transition({ from: 'step1_done', to: 'step2_done', retryAttempts: 2 })
  async autoRetryStep(state: ErrorRetryState, ctx: RunContext) {
    const attempt = ctx.execution!.retryCount + 1;
    await this.step2Tool.call({ shouldFail: attempt <= 2 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Auto-retry succeeded on attempt ${attempt}.`,
    });
    this.assignState({ autoRetryAttempts: attempt });
  }

  // -- Bridge: instructions for step 2 --
  @Transition({ from: 'step2_done', to: 'step2_ready' })
  async step2Instructions(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text:
        '## Step 2: Manual retry\n\n' +
        'The next step will fail once. The workflow stays at the current place and shows an error.\n\n' +
        '**Click the Retry button next to the error message to re-run the failed step.**',
    });
  }

  // -- Step 2: Manual retry --
  @Transition({ from: 'step2_ready', to: 'step3_done' })
  async manualRetryStep(_state: ErrorRetryState, ctx: RunContext) {
    const attempt = ctx.execution!.retryCount + 1;
    await this.step2Tool.call({ shouldFail: attempt <= 1 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Manual retry succeeded on attempt ${attempt}.`,
    });
    this.assignState({ manualRetryAttempts: attempt });
  }

  // -- Bridge: instructions for step 3 --
  @Transition({ from: 'step3_done', to: 'step3_ready' })
  async step3Instructions(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text:
        '## Step 3: Custom error place\n\n' +
        'The next step always fails and transitions to a custom error place (`error_custom`).\n\n' +
        '**Click the "Recover" button that appears below to trigger the recovery transition.**',
    });
  }

  // -- Step 3: Custom error place --
  @Transition({ from: 'step3_ready', to: 'step4_done', errorPlace: 'error_custom' })
  async customErrorStep(_state: ErrorRetryState) {
    await this.step2Tool.call({ shouldFail: true });
  }

  @Transition({ from: 'error_custom', to: 'step4_done', wait: true })
  async handleCustomError(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Recovered via custom error handler!',
    });
  }

  // -- Bridge: instructions for step 4 --
  @Transition({ from: 'step4_done', to: 'step4_ready' })
  async step4Instructions(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text:
        '## Step 4: Timeout\n\n' +
        'The next step has a 2-second timeout but takes 5 seconds. It will be killed by the timeout.\n\n' +
        '**Click the Retry button — the second attempt will be fast and succeed.**',
    });
  }

  // -- Step 4: Timeout --
  @Transition({ from: 'step4_ready', to: 'step5_done', timeout: 2000 })
  async timeoutStep(_state: ErrorRetryState, ctx: RunContext) {
    const attempt = ctx.execution!.retryCount + 1;
    // First attempt: 5s (exceeds 2s timeout). Second attempt: instant.
    await this.slowTool.call({ delayMs: attempt <= 1 ? 5000 : 0 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Timeout step succeeded on attempt ${attempt}.`,
    });
    this.assignState({ timeoutAttempts: attempt });
  }

  // -- Bridge: instructions for step 5 --
  @Transition({ from: 'step5_done', to: 'step5_ready' })
  async step5Instructions(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text:
        '## Step 5: Hybrid (auto-retry + custom error place)\n\n' +
        'The next step always fails. It auto-retries once, then transitions to `error_hybrid`.\n\n' +
        '**Click the "Recover" button that appears below.**',
    });
  }

  // -- Step 5: Hybrid --
  @Transition({ from: 'step5_ready', to: 'step6_done', retryAttempts: 1, errorPlace: 'error_hybrid' })
  async hybridStep(_state: ErrorRetryState) {
    await this.step2Tool.call({ shouldFail: true });
  }

  @Transition({ from: 'error_hybrid', to: 'step6_done', wait: true })
  async handleHybridError(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Recovered via hybrid error handler!',
    });
  }

  // -- Bridge: instructions for step 6 --
  @Transition({ from: 'step6_done', to: 'step6_ready' })
  async step6Instructions(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text:
        '## Step 6: retryTarget (auto-retry via a different place)\n\n' +
        'The next step fails twice. Each failure auto-retries — but instead of re-running the same ' +
        'transition, the framework routes through `retry_prep`, which does some preparation work ' +
        '(e.g. cache invalidation, token refresh) and then advances back to retry the operation. ' +
        'On the 3rd attempt the operation succeeds.\n\n' +
        '**No action required — just watch.**',
    });
  }

  // -- Step 6: retryTarget --
  // On failure: auto-retry up to 2x via 'retry_prep' (each retry re-enters there, not here).
  // After 2 retries are exhausted, route to errorPlace.
  @Transition({
    from: 'step6_ready',
    to: 'step7_done',
    retryAttempts: 2,
    retryTarget: 'retry_prep',
    errorPlace: 'error_retry_target',
  })
  async retryTargetStep(state: ErrorRetryState, ctx: RunContext) {
    const attempt = ctx.execution!.retryCount + 1;
    await this.step2Tool.call({ shouldFail: attempt <= 2 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `retryTarget step succeeded on attempt ${attempt} (after ${state.retryTargetPreps} prep run(s)).`,
    });
    this.assignState({ retryTargetAttempts: attempt });
  }

  // The retry-target place: does prep work, then loops back to re-attempt the originator.
  @Transition({ from: 'retry_prep', to: 'step6_ready' })
  async retryPrep(state: ErrorRetryState) {
    const preps = (state.retryTargetPreps ?? 0) + 1;
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Running prep #${preps} before retrying the failed step.`,
    });
    this.assignState({ retryTargetPreps: preps });
  }

  // Reached only if retryTargetStep keeps failing past its budget.
  @Transition({ from: 'error_retry_target', to: 'step7_done', wait: true })
  async handleRetryTargetError(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'retryTarget budget exhausted — recovered via error handler.',
    });
  }

  // -- Bridge: instructions for step 7 --
  @Transition({ from: 'step7_done', to: 'step7_ready' })
  async step7Instructions(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: [
        '## Step 7: Sub-workflow failure routed via errorPlace',
        '',
        `The next step spawns a child workflow that always throws. The parent's wait transition ` +
          'declares `errorPlace: "sub_failed"`, so the failure callback is routed to a recovery ' +
          'transition instead of leaking null data into the happy-path body.',
        '',
        '**Click the "Recover" button that appears below.**',
      ].join('\n'),
    });
  }

  // -- Step 7: Sub-workflow + errorPlace --
  @Transition({ from: 'step7_ready', to: 'awaiting_child' })
  async spawnFailingChild(_state: ErrorRetryState) {
    await this.failingChild.run({}, { callback: { transition: 'childCompleted' } });
  }

  // Happy path: this body only runs if the child succeeds (it won't, in this example).
  @Transition({ from: 'awaiting_child', to: 'done', wait: true, errorPlace: 'sub_failed' })
  async childCompleted(_state: ErrorRetryState, _input: TransitionInput) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Child workflow completed successfully (unexpected for this demo).',
    });
  }

  // Failure recovery transition for the failing child.
  @Transition({ from: 'sub_failed', to: 'done', wait: true })
  async handleSubFailed(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Recovered from sub-workflow failure via errorPlace routing.',
    });
  }

  @Transition({ from: 'done', to: 'end' })
  async showResult(_state: ErrorRetryState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'All seven retry modes completed successfully!',
    });
  }
}
