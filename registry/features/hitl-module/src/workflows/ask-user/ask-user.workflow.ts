import { z } from 'zod';
import type { RunContext } from '@loopstack/common';
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import { AskUserConfirmDocument } from '../../documents/ask-user-confirm-document.js';
import { AskUserDocument } from '../../documents/ask-user-document.js';
import { AskUserOptionsDocument } from '../../documents/ask-user-options-document.js';

const AskUserArgsSchema = z.object({
  question: z.string(),
  mode: z.enum(['text', 'options', 'confirm']).optional(),
  options: z.array(z.string()).optional(),
  allowCustomAnswer: z.boolean().optional(),
});

type AskUserArgs = z.infer<typeof AskUserArgsSchema>;

const AskUserAnswerSchema = z.object({
  answer: z.string(),
});

type AskUserState = AskUserArgs;

@Workflow({
  name: 'ask_user',
  title: 'Ask User',
  description:
    'Generic sub-workflow that presents a question to the user and waits for their answer.\nUsed by async tool calls (e.g. askClarification) to interrupt an agent loop for user input.\nSupports three modes: text (default), options (pick from a list), and confirm (yes/no).',
  schema: AskUserArgsSchema,
})
export class AskUserWorkflow extends BaseWorkflow<AskUserArgs, AskUserState> {
  @Transition({ to: 'show_question' })
  async start(state: AskUserState, ctx: RunContext): Promise<AskUserState> {
    const args = ctx.args as AskUserArgs;
    return { ...state, ...args };
  }

  @Transition({ from: 'show_question', to: 'waiting_for_user', priority: 10 })
  @Guard('isOptionsMode')
  async showQuestionOptions(state: AskUserState): Promise<AskUserState> {
    await this.documentStore.save(
      AskUserOptionsDocument,
      { question: state.question, options: state.options ?? [], allowCustomAnswer: state.allowCustomAnswer },
      { id: 'question' },
    );
    return state;
  }

  @Transition({ from: 'show_question', to: 'waiting_for_user', priority: 10 })
  @Guard('isConfirmMode')
  async showQuestionConfirm(state: AskUserState): Promise<AskUserState> {
    await this.documentStore.save(AskUserConfirmDocument, { question: state.question }, { id: 'question' });
    return state;
  }

  @Transition({ from: 'show_question', to: 'waiting_for_user' })
  async showQuestionText(state: AskUserState): Promise<AskUserState> {
    await this.documentStore.save(AskUserDocument, { question: state.question }, { id: 'question' });
    return state;
  }

  @Transition({ from: 'waiting_for_user', to: 'end', wait: true, schema: AskUserAnswerSchema })
  async userAnswered(state: AskUserState, payload: { answer: string }): Promise<{ answer: string }> {
    if (state.mode === 'options') {
      await this.documentStore.save(
        AskUserOptionsDocument,
        {
          question: state.question,
          options: state.options ?? [],
          allowCustomAnswer: state.allowCustomAnswer,
          answer: payload.answer,
        },
        { id: 'question' },
      );
    } else if (state.mode === 'confirm') {
      await this.documentStore.save(
        AskUserConfirmDocument,
        { question: state.question, answer: payload.answer },
        { id: 'question' },
      );
    } else {
      await this.documentStore.save(
        AskUserDocument,
        { question: state.question, answer: payload.answer },
        { id: 'question' },
      );
    }

    return { answer: payload.answer };
  }

  private isOptionsMode(state: AskUserState): boolean {
    return (
      state.mode === 'options' || (state.mode === undefined && Array.isArray(state.options) && state.options.length > 0)
    );
  }

  private isConfirmMode(state: AskUserState): boolean {
    return state.mode === 'confirm';
  }
}
