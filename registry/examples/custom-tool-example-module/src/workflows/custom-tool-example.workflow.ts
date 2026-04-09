import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { MathSumTool } from '../tools';
import { CounterTool } from '../tools';

@Workflow({
  uiConfig: __dirname + '/custom-tool-example.ui.yaml',
  schema: z
    .object({
      a: z.number().default(1),
      b: z.number().default(2),
    })
    .strict(),
})
export class CustomToolExampleWorkflow extends BaseWorkflow<{ a: number; b: number }> {
  @InjectTool() private counterTool: CounterTool;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectTool() private mathTool: MathSumTool;

  total?: number;

  @Initial({ to: 'waiting_for_user' })
  async calculate(args: { a: number; b: number }) {
    // Use a custom tool
    const calcResult = await this.mathTool.call({ a: args.a, b: args.b });
    this.total = calcResult.data as number;

    // Display the result
    await this.createChatMessage.call({
      role: 'assistant',
      content: `Tool calculation result:\n${args.a} + ${args.b} = ${this.total}`,
    });

    // Alternatively, use a custom workflow method
    await this.createChatMessage.call({
      role: 'assistant',
      content: `Alternatively, using workflow method:\n${args.a} + ${args.b} = ${this.sum(args.a, args.b)}`,
    });

    // Count before pause — should be 1, 2, 3
    const c1 = await this.counterTool.call({});
    const c2 = await this.counterTool.call({});
    const c3 = await this.counterTool.call({});

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Counter before pause: ${c1.data}, ${c2.data}, ${c3.data}\n\nPress Next to continue...`,
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'resumed', wait: true })
  async userContinue() {
    // User pressed Next — counter state should persist from checkpoint
  }

  @Final({ from: 'resumed' })
  async continueCount(): Promise<{ total: number | undefined }> {
    // Count after resume — should continue: 4, 5, 6
    const c4 = await this.counterTool.call({});
    const c5 = await this.counterTool.call({});
    const c6 = await this.counterTool.call({});

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Counter after resume: ${c4.data}, ${c5.data}, ${c6.data}\n\nIf state persisted, this should be 4, 5, 6.`,
    });

    return { total: this.total };
  }

  private sum(a: number, b: number) {
    return a + b;
  }
}
