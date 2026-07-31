import { describe, expect, it } from 'vitest';
import { HitlModule } from '@loopstack/hitl';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AskUserTextExampleWorkflow } from '../ask-user-text-example.workflow';

describe('AskUserTextExampleWorkflow', () => {
  it('answers the inline AskUserWorkflow child and completes', async () => {
    const run = await runWorkflow(AskUserTextExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
      answers: { userAnswered: { answer: 'Ada' } },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['askName', 'answerReceived']);
    expect(run.result).toEqual({ name: 'Ada' });

    expect(run.children).toHaveLength(1);
    expect(run.children[0].workflowName).toBe('ask_user');
    expect(run.children[0].status).toBe('completed');

    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('Hello, Ada!');
  });

  it('parks with the question shown when no answer is scripted', async () => {
    const run = await runWorkflow(AskUserTextExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlModule, HitlExamplesModule],
    });

    expect(run.status).toBe('waiting');
    expect(run.children[0].status).toBe('waiting');
    expect(
      run.children[0].documents.some((d) => (d.content as { question?: string }).question === 'What is your name?'),
    ).toBe(true);
  });
});
