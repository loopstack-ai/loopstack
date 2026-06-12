import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { MathSumTool } from '../tools';
import { CounterTool } from '../tools';

interface CustomToolExampleState {
  total?: number;
}

@Workflow({
  title: 'Custom Tool',
  description:
    'This workflow demonstrates the usage of custom tools, including both stateless and stateful tools.\nIt performs a simple addition operation using a custom MathSumTool and showcases the behavior of\nstateless and stateful counter tools. It also tests that tool state persists across checkpoints.',
  widget: __dirname + '/custom-tool-example.ui.yaml',
  schema: z
    .object({
      a: z.number().default(1),
      b: z.number().default(2),
    })
    .strict(),
})
export class CustomToolExampleWorkflow extends BaseWorkflow<{ a: number; b: number }, CustomToolExampleState> {
  constructor(
    private readonly counterTool: CounterTool,
    private readonly mathTool: MathSumTool,
  ) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async calculate(state: CustomToolExampleState, ctx: RunContext): Promise<CustomToolExampleState> {
    const args = ctx.args as { a: number; b: number };
    // Use a custom tool
    const calcResult = await this.mathTool.call({ a: args.a, b: args.b });
    const total = calcResult.data as number;

    // Display the result
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Tool calculation result:\n${args.a} + ${args.b} = ${total}`,
    });

    // Alternatively, use a custom workflow method
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Alternatively, using workflow method:\n${args.a} + ${args.b} = ${this.sum(args.a, args.b)}`,
    });

    // Count before pause — should be 1, 2, 3
    const c1 = await this.counterTool.call();
    const c2 = await this.counterTool.call();
    const c3 = await this.counterTool.call();

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Counter before pause: ${c1.data}, ${c2.data}, ${c3.data}\n\nPress Next to continue...`,
    });
    return { ...state, total };
  }

  @Transition({ from: 'waiting_for_user', to: 'resumed', wait: true })
  async userContinue(state: CustomToolExampleState): Promise<CustomToolExampleState> {
    // User pressed Next — counter state should persist from checkpoint
    return state;
  }

  @Transition({ from: 'resumed', to: 'end' })
  async continueCount(state: CustomToolExampleState): Promise<{ total: number | undefined }> {
    // Count after resume — should continue: 4, 5, 6
    const c4 = await this.counterTool.call();
    const c5 = await this.counterTool.call();
    const c6 = await this.counterTool.call();

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Counter after resume: ${c4.data}, ${c5.data}, ${c6.data}\n\nIf state persisted, this should be 4, 5, 6.`,
    });

    return { total: state.total };
  }

  private sum(a: number, b: number) {
    return a + b;
  }
}
