import { describe, expect, it } from 'vitest';
import { HitlModule } from '@loopstack/hitl';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AskUserTextExampleWorkflow } from '../ask-user-text-example.workflow';

describe('AskUserTextExampleWorkflow', () => {
  const runs: TestRun[] = [];

  it('answers the inline AskUserWorkflow child and completes', async () => {
    const run = await runWorkflow(AskUserTextExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      answers: { userAnswered: { answer: 'Ada' } },
    });
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['askName', 'answerReceived']);
    expect(run.result).toEqual({ name: 'Ada' });

    expect(run.children).toHaveLength(1);
    expect(run.children[0].workflowName).toBe('ask_user');
    expect(run.children[0].status).toBe('completed');

    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('Hello, Ada!');

    // A completed run shows the user nothing to answer.
    expect(run.parkView()).toBeUndefined();
  });

  it('parks with the question shown when no answer is scripted', async () => {
    const run = await runWorkflow(AskUserTextExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
    });
    runs.push(run);

    expect(run.status).toBe('waiting');
    expect(run.children[0].status).toBe('waiting');

    // What the user would actually see: the text prompt of the ask_user sub-workflow —
    // resolved by the same canonical rules the CLI and Studio use.
    const view = run.parkView();
    expect(view).toMatchObject({
      workflowId: run.children[0].workflowId,
      workflowName: 'ask_user',
      widget: 'text-prompt',
      documentName: 'ask_user',
      content: { question: 'What is your name?' },
      transitions: ['userAnswered'],
      defaultTransition: 'userAnswered',
    });
  });

  it('covers every transition and park (coverage gate)', () => {
    const cov = coverage(runs, AskUserTextExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
