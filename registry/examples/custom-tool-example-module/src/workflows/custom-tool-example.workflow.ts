import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { MathSumTool } from '../tools';
import { CounterTool } from '../tools';

interface CustomToolExampleState {
  total?: number;
}

const CustomToolExampleArgsSchema = z
  .object({
    a: z.number().default(1),
    b: z.number().default(2),
  })
  .strict();

type CustomToolExampleArgs = z.infer<typeof CustomToolExampleArgsSchema>;

@Workflow({
  title: 'Custom Tool',
  description:
    'This workflow demonstrates the usage of custom tools, including both stateless and stateful tools.\nIt performs a simple addition operation using a custom MathSumTool and showcases the behavior of\nstateless and stateful counter tools. It also tests that tool state persists across checkpoints.',
  widget: './custom-tool-example.ui.yaml',
  schema: CustomToolExampleArgsSchema,
})
export class CustomToolExampleWorkflow extends BaseWorkflow<CustomToolExampleArgs> {
  constructor(
    private readonly counterTool: CounterTool,
    private readonly mathTool: MathSumTool,
  ) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async calculate(state: CustomToolExampleState, ctx: RunContext<CustomToolExampleArgs>) {
    // Use a custom tool
    const calcResult = await this.mathTool.call({ a: ctx.args.a, b: ctx.args.b });
    const total = calcResult.data as number;

    // Display the result
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Tool calculation result:\n${ctx.args.a} + ${ctx.args.b} = ${total}`,
    });

    // Alternatively, use a custom workflow method
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Alternatively, using workflow method:\n${ctx.args.a} + ${ctx.args.b} = ${this.sum(ctx.args.a, ctx.args.b)}`,
    });

    // Count before pause — should be 1, 2, 3
    const c1 = await this.counterTool.call();
    const c2 = await this.counterTool.call();
    const c3 = await this.counterTool.call();

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Counter before pause: ${c1.data}, ${c2.data}, ${c3.data}\n\nPress Next to continue...`,
    });
    this.assignState({ total });
  }

  @Transition({ from: 'waiting_for_user', to: 'resumed', wait: true })
  userContinue(_state: CustomToolExampleState) {
    // User pressed Next — counter state should persist from checkpoint
  }

  @Transition({ from: 'resumed', to: 'end' })
  async continueCount(state: CustomToolExampleState) {
    // Count after resume — should continue: 4, 5, 6
    const c4 = await this.counterTool.call();
    const c5 = await this.counterTool.call();
    const c6 = await this.counterTool.call();

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Counter after resume: ${c4.data}, ${c5.data}, ${c6.data}\n\nIf state persisted, this should be 4, 5, 6.`,
    });

    this.setResult({ total: state.total } as unknown as Record<string, unknown>);
  }

  private sum(a: number, b: number) {
    return a + b;
  }
}
