import { describe, expect, it } from 'vitest';
import { HitlModule } from '@loopstack/hitl';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { ConfirmContentExampleWorkflow } from '../confirm-content-example.workflow';

describe('ConfirmContentExampleWorkflow', () => {
  const runs: TestRun[] = [];
  const run = async (decision?: 'userConfirmed' | 'userDenied') => {
    const result = await runWorkflow(ConfirmContentExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      ...(decision ? { answers: { [decision]: {} } } : {}),
    });
    runs.push(result);
    return result;
  };

  it('user confirms the summary', async () => {
    const result = await run('userConfirmed');

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('completed');
    expect(result.result).toEqual({ confirmed: true });
  });

  it('user denies the summary', async () => {
    const result = await run('userDenied');

    expect(result.status).toBe('completed');
    expect(result.result).toEqual({ confirmed: false });
    const texts = result.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('User denied — aborting deploy.');
  });

  it('parks showing the review form with the deploy summary', async () => {
    const result = await run();

    expect(result.status).toBe('waiting');
    // The whole point of this example: show the user a markdown blob and wait. parkView()
    // asserts they would see the review form (with its Deny/Confirm actions) carrying the summary.
    const view = result.parkView();
    expect(view).toMatchObject({
      workflowName: 'confirm_user',
      widget: 'form',
      content: { markdown: expect.stringContaining('Ready to deploy?') },
      actions: ['Deny', 'Confirm'],
    });
  });

  it('covers every transition and park (coverage gate)', () => {
    const cov = coverage(runs, ConfirmContentExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
