import { describe, expect, it } from 'vitest';
import { HitlModule } from '@loopstack/hitl';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AskUserOptionsExampleWorkflow } from '../ask-user-options-example.workflow';

describe('AskUserOptionsExampleWorkflow', () => {
  const runs: TestRun[] = [];
  const run = async (answer?: string) => {
    const result = await runWorkflow(AskUserOptionsExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      ...(answer ? { answers: { userAnswered: { answer } } } : {}),
    });
    runs.push(result);
    return result;
  };

  it('picks a listed option', async () => {
    const result = await run('staging');

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('completed');
    expect(result.result).toEqual({ environment: 'staging', custom: false });
  });

  it('accepts a custom answer outside the option list', async () => {
    const result = await run('local-docker');

    expect(result.status).toBe('completed');
    expect(result.result).toEqual({ environment: 'local-docker', custom: true });
    const texts = result.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('Custom environment selected: local-docker');
  });

  it('parks showing the choices when no answer is scripted', async () => {
    const result = await run();

    expect(result.status).toBe('waiting');
    // The options list and custom-answer affordance the user would see, resolved from the
    // AskUserWorkflow child by the same canonical rules the CLI and Studio use.
    const view = result.parkView();
    expect(view).toMatchObject({
      workflowName: 'ask_user',
      widget: 'choices',
      content: {
        question: 'Which environment should we deploy to?',
        options: ['staging', 'production'],
        allowCustomAnswer: true,
      },
      defaultTransition: 'userAnswered',
    });
  });

  it('covers every transition and park (coverage gate)', () => {
    const cov = coverage(runs, AskUserOptionsExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
