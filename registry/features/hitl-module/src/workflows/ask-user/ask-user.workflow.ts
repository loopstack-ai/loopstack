import { z } from 'zod';
import { BaseWorkflow, Final, Guard, Initial, Transition, Workflow } from '@loopstack/common';
import { AskUserConfirmDocument } from '../../documents/ask-user-confirm-document';
import { AskUserDocument } from '../../documents/ask-user-document';
import { AskUserOptionsDocument } from '../../documents/ask-user-options-document';

const AskUserAnswerSchema = z.object({
  answer: z.string(),
});

@Workflow({
  uiConfig: __dirname + '/ask-user.ui.yaml',
  schema: z.object({
    question: z.string(),
    mode: z.enum(['text', 'options', 'confirm']).optional(),
    options: z.array(z.string()).optional(),
    allowCustomAnswer: z.boolean().optional(),
  }),
})
export class AskUserWorkflow extends BaseWorkflow {
  @Initial({ to: 'show_question' })
  start() {}

  @Transition({ from: 'show_question', to: 'waiting_for_user', priority: 10 })
  @Guard('isOptionsMode')
  async showQuestionOptions() {
    const { question, options, allowCustomAnswer } = this.ctx.args as {
      question: string;
      options?: string[];
      allowCustomAnswer?: boolean;
    };
    await this.repository.save(
      AskUserOptionsDocument,
      { question, options: options ?? [], allowCustomAnswer },
      { id: 'question' },
    );
  }

  @Transition({ from: 'show_question', to: 'waiting_for_user', priority: 10 })
  @Guard('isConfirmMode')
  async showQuestionConfirm() {
    const { question } = this.ctx.args as { question: string };
    await this.repository.save(AskUserConfirmDocument, { question }, { id: 'question' });
  }

  @Transition({ from: 'show_question', to: 'waiting_for_user' })
  async showQuestionText() {
    const { question } = this.ctx.args as { question: string };
    await this.repository.save(AskUserDocument, { question }, { id: 'question' });
  }

  @Final({ from: 'waiting_for_user', wait: true, schema: AskUserAnswerSchema })
  async userAnswered(payload: { answer: string }): Promise<{ answer: string }> {
    const { question, mode, options, allowCustomAnswer } = this.ctx.args as {
      question: string;
      mode?: string;
      options?: string[];
      allowCustomAnswer?: boolean;
    };

    if (mode === 'options') {
      await this.repository.save(
        AskUserOptionsDocument,
        { question, options: options ?? [], allowCustomAnswer, answer: payload.answer },
        { id: 'question' },
      );
    } else if (mode === 'confirm') {
      await this.repository.save(AskUserConfirmDocument, { question, answer: payload.answer }, { id: 'question' });
    } else {
      await this.repository.save(AskUserDocument, { question, answer: payload.answer }, { id: 'question' });
    }

    return { answer: payload.answer };
  }

  private isOptionsMode(): boolean {
    const args = this.ctx.args as { mode?: string; options?: string[] };
    return (
      args?.mode === 'options' || (args?.mode === undefined && Array.isArray(args?.options) && args.options.length > 0)
    );
  }

  private isConfirmMode(): boolean {
    return (this.ctx.args as { mode?: string })?.mode === 'confirm';
  }
}
