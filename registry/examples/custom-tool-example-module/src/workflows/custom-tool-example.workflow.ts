import { WorkflowBase } from '@loopstack/core';
import {
  BlockConfig,
  Helper,
  Tool,
  WithArguments,
  WithState,
} from '@loopstack/common';
import { z } from 'zod';
import { MathSumTool } from '../tools';
import { CounterTool } from '../tools';
import { Injectable } from '@nestjs/common';
import { CreateChatMessage } from '@loopstack/core-ui-module';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/custom-tool-example.workflow.yaml',
})
@WithArguments(
  z
    .object({
      a: z.number().default(1),
      b: z.number().default(2),
    })
    .strict(),
)
@WithState(
  z
    .object({
      total: z.number().optional(),
      count1: z.number().optional(),
      count2: z.number().optional(),
      count3: z.number().optional(),
    })
    .strict(),
)
export class CustomToolExampleWorkflow extends WorkflowBase {
  @Tool() private counterTool: CounterTool;
  @Tool() private createChatMessage: CreateChatMessage;
  @Tool() private mathTool: MathSumTool;

  @Helper()
  sum(a: number, b: number) {
    return a + b;
  }
}
