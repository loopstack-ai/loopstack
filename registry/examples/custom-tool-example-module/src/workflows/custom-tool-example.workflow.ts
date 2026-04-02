import { z } from 'zod';
import { Initial, InjectTool, Input, Output, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { MathSumTool } from '../tools';
import { CounterTool } from '../tools';

@Workflow({
  uiConfig: __dirname + '/custom-tool-example.workflow.yaml',
})
export class CustomToolExampleWorkflow {
  @InjectTool() private counterTool: CounterTool;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectTool() private mathTool: MathSumTool;

  @Input({
    schema: z
      .object({
        a: z.number().default(1),
        b: z.number().default(2),
      })
      .strict(),
  })
  args: {
    a: number;
    b: number;
  };

  total?: number;
  count1?: number;
  count2?: number;
  count3?: number;

  @Output()
  result() {
    return {
      total: this.total,
    };
  }

  @Initial({ to: 'end' })
  async calculate() {
    // Use a custom tool
    const calcResult = await this.mathTool.run({ a: this.args.a, b: this.args.b });
    this.total = calcResult.data as number;

    // Display the result
    await this.createChatMessage.run({
      role: 'assistant',
      content: `Tool calculation result:\n${this.args.a} + ${this.args.b} = ${this.total}`,
    });

    // Alternatively, use a custom workflow method
    await this.createChatMessage.run({
      role: 'assistant',
      content: `Alternatively, using workflow method:\n${this.args.a} + ${this.args.b} = ${this.sum(this.args.a, this.args.b)}`,
    });

    // Use a stateful tool (counter retains state across calls)
    const count1Result = await this.counterTool.run();
    this.count1 = count1Result.data as number;
    const count2Result = await this.counterTool.run();
    this.count2 = count2Result.data as number;
    const count3Result = await this.counterTool.run();
    this.count3 = count3Result.data as number;

    await this.createChatMessage.run({
      role: 'assistant',
      content: `Counter tool should count:\n\n${this.count1}, ${this.count2}, ${this.count3}`,
    });
  }

  private sum(a: number, b: number) {
    return a + b;
  }
}
