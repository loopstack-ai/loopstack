import { describe, expect, it } from 'vitest';
import { HitlModule } from '@loopstack/hitl';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AskUserOptionsExampleWorkflow } from '../ask-user-options-example.workflow';

describe('AskUserOptionsExampleWorkflow', () => {
  it('picks a listed option', async () => {
    const run = await runWorkflow(AskUserOptionsExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      answers: { userAnswered: { answer: 'staging' } },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ environment: 'staging', custom: false });
  });

  it('accepts a custom answer outside the option list', async () => {
    const run = await runWorkflow(AskUserOptionsExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      answers: { userAnswered: { answer: 'local-docker' } },
    });

    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ environment: 'local-docker', custom: true });
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('Custom environment selected: local-docker');
  });
});
