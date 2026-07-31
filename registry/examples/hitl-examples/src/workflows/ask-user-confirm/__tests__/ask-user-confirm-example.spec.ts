import { describe, expect, it } from 'vitest';
import { HitlModule } from '@loopstack/hitl';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AskUserConfirmExampleWorkflow } from '../ask-user-confirm-example.workflow';

describe('AskUserConfirmExampleWorkflow', () => {
  it('confirms with "yes"', async () => {
    const run = await runWorkflow(AskUserConfirmExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      answers: { userAnswered: { answer: 'yes' } },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ sent: true });
  });

  it('declines with "no"', async () => {
    const run = await runWorkflow(AskUserConfirmExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      answers: { userAnswered: { answer: 'no' } },
    });

    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ sent: false });
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('Skipping — email was not sent.');
  });
});
