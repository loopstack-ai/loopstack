import { Module } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseWorkflow, Document, StudioApp, Transition, Workflow } from '@loopstack/common';
import type { TransitionInput } from '@loopstack/common';
import { failure, runWorkflow } from '@loopstack/testing';

// --- Probes ---------------------------------------------------------------------------------

const RecoveryPromptSchema = z.object({ question: z.string(), answer: z.boolean().optional() });

@Document({
  schema: RecoveryPromptSchema,
  widget: { widget: 'confirm-prompt', options: { transition: 'recover' } },
  meta: { enableAtPlaces: ['recovery'] },
})
class RecoveryPromptDocument {
  question: string;
  answer?: boolean;
}

@Document({
  schema: z.object({ question: z.string() }),
  widget: { widget: 'text-prompt', options: { transition: 'proceed' } },
  meta: { hideAtPlaces: ['ask'] },
})
class HiddenPromptDocument {
  question: string;
}

@Document({
  schema: z.object({ question: z.string(), answer: z.boolean().optional() }),
  widget: { widget: 'confirm-prompt', options: { transition: 'proceed' } },
})
class AnsweredPromptDocument {
  question: string;
  answer?: boolean;
}

@Workflow({ title: 'Park View Probe — error place recovery' })
class RecoveryViewProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'waiting' })
  async start() {
    await this.documentStore.save(RecoveryPromptDocument, { question: 'Retry the child?' });
  }

  @Transition({ from: 'waiting', to: 'end', wait: true, errorPlace: 'recovery' })
  onChild(_state: Record<string, unknown>, input: TransitionInput<{ value: string }>) {
    this.setResult({ got: input.data?.value });
  }

  @Transition({ from: 'recovery', to: 'end' })
  recover() {
    this.setResult({ recovered: true });
  }
}

@Workflow({ title: 'Park View Probe — hidden prompt' })
class HiddenViewProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'ask' })
  async start() {
    await this.documentStore.save(HiddenPromptDocument, { question: 'You should not see this.' });
  }

  @Transition({ from: 'ask', to: 'end', wait: true })
  proceed() {}
}

@Workflow({ title: 'Park View Probe — answered prompt' })
class AnsweredViewProbeWorkflow extends BaseWorkflow {
  @Transition({ to: 'ask' })
  async start() {
    // answer: false is a recorded "No" — present means answered (canonical ruling).
    await this.documentStore.save(AnsweredPromptDocument, { question: 'Proceed?', answer: false });
  }

  @Transition({ from: 'ask', to: 'end', wait: true })
  proceed() {}
}

@StudioApp({
  title: 'Park View Probes',
  workflows: [RecoveryViewProbeWorkflow, HiddenViewProbeWorkflow, AnsweredViewProbeWorkflow],
})
@Module({
  providers: [RecoveryViewProbeWorkflow, HiddenViewProbeWorkflow, AnsweredViewProbeWorkflow],
  exports: [RecoveryViewProbeWorkflow, HiddenViewProbeWorkflow, AnsweredViewProbeWorkflow],
})
class ParkViewProbeModule {}

// --- parkView() -----------------------------------------------------------------------------

describe('run.parkView()', () => {
  it('shows the recovery prompt on a run failed at its error place', async () => {
    const run = await runWorkflow(RecoveryViewProbeWorkflow, undefined, {
      imports: [ParkViewProbeModule],
      answers: { onChild: failure('child died') },
    });

    expect(run.status).toBe('failed');
    expect(run.place).toBe('recovery');

    // Failed-with-transitions is answerable; the prompt document saved at 'waiting'
    // stays active here via meta.enableAtPlaces.
    const view = run.parkView();
    expect(view).toMatchObject({
      workflowId: '',
      widget: 'confirm-prompt',
      documentName: 'recovery_prompt',
      content: { question: 'Retry the child?' },
      transitions: ['recover'],
      defaultTransition: 'recover',
    });
  });

  it('falls back to the bare wait when the only prompt is hidden at the current place', async () => {
    const run = await runWorkflow(HiddenViewProbeWorkflow, undefined, { imports: [ParkViewProbeModule] });

    expect(run.status).toBe('waiting');
    const view = run.parkView();
    expect(view).toMatchObject({ place: 'ask', transitions: ['proceed'], defaultTransition: 'proceed' });
    expect(view?.widget).toBeUndefined();
    expect(view?.documentName).toBeUndefined();
  });

  it('does not re-surface an answered prompt — answer: false counts as answered', async () => {
    const run = await runWorkflow(AnsweredViewProbeWorkflow, undefined, { imports: [ParkViewProbeModule] });

    expect(run.status).toBe('waiting');
    const view = run.parkView();
    expect(view?.widget).toBeUndefined();
    expect(view?.documentName).toBeUndefined();
  });
});
