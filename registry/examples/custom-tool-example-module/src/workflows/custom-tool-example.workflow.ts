import { z } from 'zod';
import { DefineHelper, InjectTool, Input, Output, State, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { MathSumTool } from '../tools';
import { CounterTool } from '../tools';

@Workflow({
  configFile: __dirname + '/custom-tool-example.workflow.yaml',
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

  @State({
    schema: z
      .object({
        total: z.number().optional(),
        count1: z.number().optional(),
        count2: z.number().optional(),
        count3: z.number().optional(),
      })
      .strict(),
  })
  state: {
    total?: number;
    count1?: number;
    count2?: number;
    count3?: number;
  };

  @Output()
  result() {
    return {
      total: this.state.total,
    };
  }

  @DefineHelper()
  sum(a: number, b: number) {
    return a + b;
  }
}
