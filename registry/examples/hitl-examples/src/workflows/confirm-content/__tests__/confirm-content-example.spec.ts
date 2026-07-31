import { describe, expect, it } from 'vitest';
import { HitlModule } from '@loopstack/hitl';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { ConfirmContentExampleWorkflow } from '../confirm-content-example.workflow';

describe('ConfirmContentExampleWorkflow', () => {
  it('user confirms the summary', async () => {
    const run = await runWorkflow(ConfirmContentExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      answers: { userConfirmed: {} },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ confirmed: true });
    expect(run.children[0].workflowName).toBe('confirm_user');
  });

  it('user denies the summary', async () => {
    const run = await runWorkflow(ConfirmContentExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      answers: { userDenied: {} },
    });

    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ confirmed: false });
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('User denied — aborting deploy.');
  });
});
