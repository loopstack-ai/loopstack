import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseWorkflow, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { runWorkflow } from '@loopstack/testing';
import { AskUserWorkflow } from '../ask-user.workflow.js';

@Workflow({ name: 'facade_spec_parent', title: 'Facade spec parent' })
class ParentWithQuestionWorkflow extends BaseWorkflow {
  constructor(private readonly askUser: AskUserWorkflow) {
    super();
  }

  @Transition({ to: 'asking' })
  async begin() {
    await this.askUser.run({ question: 'Continue?' }, { callback: { transition: 'onAnswer' } });
  }

  @Transition({ from: 'asking', to: 'end', wait: true, schema: z.object({ answer: z.string() }) })
  onAnswer(state: Record<string, unknown>, input: TransitionInput<{ answer: string }>) {
    this.setResult({ childAnswer: input.data.answer } as unknown as Record<string, unknown>);
  }
}

describe('AskUserWorkflow — runWorkflow facade', () => {
  it('answers the question via scripted answers and completes', async () => {
    const run = await runWorkflow(
      AskUserWorkflow,
      { question: 'Deploy to production?' },
      {
        answers: { userAnswered: { answer: 'yes' } },
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.place).toBe('end');
    expect(run.path).toEqual(['start', 'showQuestionText', 'userAnswered']);
    expect(run.result).toEqual({ answer: 'yes' });
    expect(run.document('question')).toMatchObject({ question: 'Deploy to production?', answer: 'yes' });
  });

  it('returns the parked run when no answer matches', async () => {
    const run = await runWorkflow(AskUserWorkflow, { question: 'Deploy?' });

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('waiting_for_user');
    expect(run.document('question')).toMatchObject({ question: 'Deploy?' });
  });

  it('answers a parked inline sub-workflow and delivers its callback to the parent', async () => {
    const run = await runWorkflow(ParentWithQuestionWorkflow, undefined, {
      providers: [AskUserWorkflow],
      answers: { userAnswered: { answer: 'yes' } },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ childAnswer: 'yes' });
    expect(run.path).toEqual(['begin', 'onAnswer']);

    expect(run.children).toHaveLength(1);
    expect(run.children[0].workflowName).toBe('ask_user');
    expect(run.children[0].status).toBe('completed');
    expect(run.children[0].result).toEqual({ answer: 'yes' });
  });
});
