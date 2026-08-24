import { describe, expect, it } from 'vitest';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { TransitionInput } from '@loopstack/common';
import { TestClock, failure, queue, runWorkflow } from '../index.js';

// --- Probes ---------------------------------------------------------------------------------

@Workflow({ title: 'Fault Probe — error place' })
class ErrorPlaceProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'waiting' })
  start() {}

  @Transition({ from: 'waiting', to: 'end', wait: true, errorPlace: 'recovery' })
  onChild(_state: Record<string, unknown>, input: TransitionInput<{ value: string }>) {
    this.setResult({ got: input.data?.value });
  }

  @Transition({ from: 'recovery', to: 'end' })
  recover() {
    this.setResult({ recovered: true });
  }
}

@Workflow({ title: 'Fault Probe — inline handling' })
class InlineFaultProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'waiting' })
  start() {}

  @Transition({ from: 'waiting', to: 'end', wait: true })
  onChild(_state: Record<string, unknown>, input: TransitionInput<unknown>) {
    this.setResult({ status: input.status, hasError: input.hasError, message: input.errorMessage });
  }
}

@Workflow({ title: 'Fault Probe — cyclic' })
class CyclicFaultProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'loop' })
  start() {}

  @Transition({ from: 'loop', to: 'loop', wait: true })
  onEvent(_state: Record<string, unknown>, input: TransitionInput<unknown>) {
    this.setResult({ lastStatus: input.status });
  }
}

@Workflow({ title: 'Timeout Probe' })
class TimeoutProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'end', timeout: 50 })
  async hang() {
    await new Promise(() => {}); // never resolves — only the timeout can end this
  }
}

@Workflow({ title: 'Instant Probe' })
class InstantProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  run() {
    this.setResult({ done: true });
  }
}

// --- failure() ------------------------------------------------------------------------------

describe('failure() — scripted sub-workflow failures', () => {
  it('routes a failed callback to the errorPlace', async () => {
    const run = await runWorkflow(ErrorPlaceProbeWorkflow, undefined, {
      answers: { onChild: failure('child died') },
    });

    // The failure lands the run at its error place, failed and awaiting manual recovery —
    // exactly what a real crashed sub-workflow produces.
    expect(run.status).toBe('failed');
    expect(run.place).toBe('recovery');
    expect(run.error).toBe('child died');
    expect(run.trace).toContainEqual(
      expect.objectContaining({ type: 'transition.failed', transitionId: 'onChild', error: 'child died' }),
    );
  });

  it('falls through to the body with the failure status for inline handling', async () => {
    const run = await runWorkflow(InlineFaultProbeWorkflow, undefined, {
      answers: { onChild: failure('boom', 'canceled') },
    });

    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ status: 'canceled', hasError: true, message: 'boom' });
  });

  it('composes with queue(): answer first, fail later', async () => {
    const run = await runWorkflow(CyclicFaultProbeWorkflow, undefined, {
      answers: { onEvent: queue({ turn: 1 }, failure('then it dies')) },
    });

    // Two turns taken (one answered, one failed inline), then parked with the queue exhausted.
    expect(run.status).toBe('waiting');
    expect(run.path).toEqual(['start', 'onEvent', 'onEvent']);
    expect(run.result).toEqual({ lastStatus: 'failed' });
  });
});

// --- TestClock ------------------------------------------------------------------------------

describe('TestClock — deterministic time', () => {
  it('makes a transition timeout testable without waiting real time', async () => {
    const clock = new TestClock(1_000);
    const pending = runWorkflow(TimeoutProbeWorkflow, undefined, { clock });

    await clock.waitForScheduled(); // the transition armed its 50ms timeout
    clock.advance(51);

    const run = await pending;
    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/timed out after 50ms/);
    expect(run.path).toEqual(['hang']); // the attempt executed — and failed
    expect(run.trace).toContainEqual(
      expect.objectContaining({
        type: 'transition.failed',
        transitionId: 'hang',
        error: expect.stringContaining('timed out'),
      }),
    );
  });

  it('produces reproducible trace timestamps', async () => {
    const clock = new TestClock(42);
    const run = await runWorkflow(InstantProbeWorkflow, undefined, { clock });

    expect(run.status).toBe('completed');
    expect(run.trace.length).toBeGreaterThan(0);
    expect(run.trace.every((e) => e.ts === 42)).toBe(true);
  });

  it('holds scheduled callbacks until advance, fires in due-order, honors cancel', async () => {
    const clock = new TestClock();
    const fired: string[] = [];
    clock.schedule(() => fired.push('late'), 100);
    clock.schedule(() => fired.push('early'), 10);
    const cancel = clock.schedule(() => fired.push('canceled'), 50);
    cancel();

    expect(fired).toEqual([]);
    clock.advance(100);
    expect(fired).toEqual(['early', 'late']);

    await expect(clock.waitForScheduled(0)).resolves.toBeUndefined();
  });
});
