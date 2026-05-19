import { BaseWorkflow, Final, Initial, InjectTool, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { SlowTool } from './tools/slow.tool';
import { Step1Tool } from './tools/step1.tool';
import { Step2Tool } from './tools/step2.tool';

/**
 * Demonstrates all retry/error modes in sequence:
 *
 * Step 1: Auto-retry — fails twice, auto-retries handle it, succeeds on 3rd.
 * Step 2: Manual retry — fails once, user clicks Retry, succeeds.
 * Step 3: Custom error place — always fails, transitions to error_custom for recovery.
 * Step 4: Timeout — slow operation times out, user clicks Retry, fast attempt succeeds.
 * Step 5: Hybrid (auto-retry + custom place) — always fails, auto-retries once, then error_hybrid.
 */
@Workflow({
  uiConfig: __dirname + '/error-retry.ui.yaml',
})
export class ErrorRetryWorkflow extends BaseWorkflow {
  @InjectTool() step1Tool: Step1Tool;
  @InjectTool() step2Tool: Step2Tool;
  @InjectTool() slowTool: SlowTool;

  autoRetryAttempts!: number;
  manualRetryAttempts!: number;
  timeoutAttempts!: number;

  @Initial({ to: 'step1_done' })
  async setup() {
    this.autoRetryAttempts = 0;
    this.manualRetryAttempts = 0;
    this.timeoutAttempts = 0;
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: '# Error Retry Example\n\nThis workflow tests five retry/error modes in sequence.',
    });
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content:
        '## Step 1: Auto-retry\n\n' +
        'The next step will fail twice. The framework auto-retries with exponential backoff ' +
        '(1s, then 2s). On the 3rd attempt it succeeds.\n\n' +
        '**No action required — just watch.**',
    });
  }

  // ── Step 1: Auto-retry ──────────────────────────────────────────────
  @Transition({ from: 'step1_done', to: 'step2_done', retry: 2 })
  async autoRetryStep() {
    this.autoRetryAttempts++;
    await this.step2Tool.call({ shouldFail: this.autoRetryAttempts <= 2 });
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Auto-retry succeeded on attempt ${this.autoRetryAttempts}.`,
    });
  }

  // ── Bridge: instructions for step 2 ────────────────────────────────
  @Transition({ from: 'step2_done', to: 'step2_ready' })
  async step2Instructions() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content:
        '## Step 2: Manual retry\n\n' +
        'The next step will fail once. The workflow stays at the current place and shows an error.\n\n' +
        '**Click the Retry button next to the error message to re-run the failed step.**',
    });
  }

  // ── Step 2: Manual retry ────────────────────────────────────────────
  @Transition({ from: 'step2_ready', to: 'step3_done' })
  async manualRetryStep() {
    this.manualRetryAttempts++;
    await this.step2Tool.call({ shouldFail: this.manualRetryAttempts <= 1 });
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Manual retry succeeded on attempt ${this.manualRetryAttempts}.`,
    });
  }

  // ── Bridge: instructions for step 3 ────────────────────────────────
  @Transition({ from: 'step3_done', to: 'step3_ready' })
  async step3Instructions() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content:
        '## Step 3: Custom error place\n\n' +
        'The next step always fails and transitions to a custom error place (`error_custom`).\n\n' +
        '**Click the "Recover" button that appears below to trigger the recovery transition.**',
    });
  }

  // ── Step 3: Custom error place ──────────────────────────────────────
  @Transition({ from: 'step3_ready', to: 'step4_done', retry: { place: 'error_custom' } })
  async customErrorStep() {
    await this.step2Tool.call({ shouldFail: true });
  }

  @Transition({ from: 'error_custom', to: 'step4_done', wait: true })
  async handleCustomError() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: 'Recovered via custom error handler!',
    });
  }

  // ── Bridge: instructions for step 4 ────────────────────────────────
  @Transition({ from: 'step4_done', to: 'step4_ready' })
  async step4Instructions() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content:
        '## Step 4: Timeout\n\n' +
        'The next step has a 2-second timeout but takes 5 seconds. It will be killed by the timeout.\n\n' +
        '**Click the Retry button — the second attempt will be fast and succeed.**',
    });
  }

  // ── Step 4: Timeout ─────────────────────────────────────────────────
  @Transition({ from: 'step4_ready', to: 'step5_done', timeout: 2000 })
  async timeoutStep() {
    this.timeoutAttempts++;
    // First attempt: 5s (exceeds 2s timeout). Second attempt: instant.
    await this.slowTool.call({ delayMs: this.timeoutAttempts <= 1 ? 5000 : 0 });
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Timeout step succeeded on attempt ${this.timeoutAttempts}.`,
    });
  }

  // ── Bridge: instructions for step 5 ────────────────────────────────
  @Transition({ from: 'step5_done', to: 'step5_ready' })
  async step5Instructions() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content:
        '## Step 5: Hybrid (auto-retry + custom error place)\n\n' +
        'The next step always fails. It auto-retries once, then transitions to `error_hybrid`.\n\n' +
        '**Click the "Recover" button that appears below.**',
    });
  }

  // ── Step 5: Hybrid ──────────────────────────────────────────────────
  @Transition({ from: 'step5_ready', to: 'done', retry: { attempts: 1, place: 'error_hybrid' } })
  async hybridStep() {
    await this.step2Tool.call({ shouldFail: true });
  }

  @Transition({ from: 'error_hybrid', to: 'done', wait: true })
  async handleHybridError() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: 'Recovered via hybrid error handler!',
    });
  }

  @Final({ from: 'done' })
  async showResult() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: 'All five retry modes completed successfully!',
    });
  }
}
