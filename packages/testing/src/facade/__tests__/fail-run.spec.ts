import { Module } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseWorkflow, Document, StudioApp, Transition, Workflow } from '@loopstack/common';
import type { FailureInput } from '@loopstack/common';
import { runWorkflow } from '../index.js';

// --- Probes ---------------------------------------------------------------------------------

@Document({ schema: z.object({ text: z.string() }) })
class NoticeDocument {
  text: string;
}

/** What a step that released something and then found the run cannot succeed looks like. */
@Workflow({ title: 'Fail Probe — reports then fails' })
class ReportingFailureProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'cleaned' })
  async clean(): Promise<void> {
    await this.documentStore.save(NoticeDocument, { text: 'The container was removed.' });
    this.assignState({ cleaned: true });
  }

  @Transition({ from: 'cleaned', to: 'end' })
  report(state: { cleaned?: boolean }): void {
    this.assignResult({ cleaned: state.cleaned === true });
    this.fail('The base was left half built.');
  }
}

@Workflow({ title: 'Fail Probe — fails mid-chain' })
class MidChainFailureProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'stopped' })
  stop(): void {
    this.fail('Nothing else is worth doing.');
  }

  @Transition({ from: 'stopped', to: 'end' })
  carryOn(): void {
    this.assignResult({ carriedOn: true });
  }
}

@Workflow({ title: 'Fail Probe — child' })
class FailingChildProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  giveUp(): void {
    this.fail('The child could not finish.');
  }
}

@Workflow({ title: 'Fail Probe — parent' })
class FailureParentProbeWorkflow extends BaseWorkflow {
  constructor(private readonly child: FailingChildProbeWorkflow) {
    super();
  }

  @Transition({ to: 'waiting' })
  async start(): Promise<void> {
    await this.child.run({}, { onSuccess: { transition: 'childDone' }, onFailure: { transition: 'childFailed' } });
  }

  @Transition({ from: 'waiting', to: 'end', wait: true })
  childDone(): void {
    this.setResult({ ok: true });
  }

  @Transition({ from: 'waiting', to: 'end', wait: true })
  childFailed(_state: Record<string, unknown>, input: FailureInput): void {
    this.setResult({ ok: false, status: input.status, reason: input.errorMessage });
  }
}

@StudioApp({
  title: 'Fail Probes',
  workflows: [
    ReportingFailureProbeWorkflow,
    MidChainFailureProbeWorkflow,
    FailingChildProbeWorkflow,
    FailureParentProbeWorkflow,
  ],
})
@Module({
  providers: [
    ReportingFailureProbeWorkflow,
    MidChainFailureProbeWorkflow,
    FailingChildProbeWorkflow,
    FailureParentProbeWorkflow,
  ],
  exports: [
    ReportingFailureProbeWorkflow,
    MidChainFailureProbeWorkflow,
    FailingChildProbeWorkflow,
    FailureParentProbeWorkflow,
  ],
})
class FailProbeModule {}

// --- fail() ---------------------------------------------------------------------------------

describe('BaseWorkflow.fail()', () => {
  it('ends the run as failed and keeps what the transition did', async () => {
    const run = await runWorkflow(ReportingFailureProbeWorkflow, undefined, { imports: [FailProbeModule] });

    expect(run.status).toBe('failed');
    expect(run.error).toBe('The base was left half built.');
    expect(run.place).toBe('end');
    // The card a person reads survives, which is the whole point of failing rather than throwing.
    expect(run.document('notice')).toEqual({ text: 'The container was removed.' });
    expect(run.result).toEqual({ cleaned: true });
  });

  it('puts the reason in the run trace', async () => {
    const run = await runWorkflow(ReportingFailureProbeWorkflow, undefined, { imports: [FailProbeModule] });

    const settled = run.trace.filter((event) => event.type === 'run.settled').at(-1);
    expect(settled).toMatchObject({ status: 'failed', error: 'The base was left half built.' });
  });

  it('stops the run, so no later transition runs', async () => {
    const run = await runWorkflow(MidChainFailureProbeWorkflow, undefined, { imports: [FailProbeModule] });

    expect(run.status).toBe('failed');
    expect(run.path).toEqual(['stop']);
    expect(run.result).toBeNull();
    expect(run.parkView()).toBeUndefined();
  });

  it('reaches the parent through its onFailure transition', async () => {
    const run = await runWorkflow(FailureParentProbeWorkflow, undefined, { imports: [FailProbeModule] });

    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ ok: false, status: 'failed', reason: 'The child could not finish.' });
    expect(run.children[0]?.status).toBe('failed');
  });
});
