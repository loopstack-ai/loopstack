import { describe, expect, it } from 'vitest';
import { HitlModule } from '@loopstack/hitl';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AskUserConfirmExampleWorkflow } from '../ask-user-confirm-example.workflow';

describe('AskUserConfirmExampleWorkflow', () => {
  const runs: TestRun[] = [];
  const run = async (answer?: 'yes' | 'no') => {
    const result = await runWorkflow(AskUserConfirmExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      ...(answer ? { answers: { userAnswered: { answer } } } : {}),
    });
    runs.push(result);
    return result;
  };

  it('confirms with "yes"', async () => {
    const result = await run('yes');

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('completed');
    expect(result.result).toEqual({ sent: true });
  });

  it('declines with "no"', async () => {
    const result = await run('no');

    expect(result.status).toBe('completed');
    expect(result.result).toEqual({ sent: false });
    const texts = result.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('Skipping — email was not sent.');
  });

  it('parks showing the yes/no prompt when no answer is scripted', async () => {
    const result = await run();

    expect(result.status).toBe('waiting');
    // The prompt lives on the AskUserWorkflow child, three levels down — parkView() walks
    // the tree and resolves the same widget the CLI and Studio render.
    const view = result.parkView();
    expect(view).toMatchObject({
      workflowName: 'ask_user',
      widget: 'confirm-prompt',
      content: { question: 'Send the email now?' },
      defaultTransition: 'userAnswered',
    });
  });

  it('covers every transition and park (coverage gate)', () => {
    const cov = coverage(runs, AskUserConfirmExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
