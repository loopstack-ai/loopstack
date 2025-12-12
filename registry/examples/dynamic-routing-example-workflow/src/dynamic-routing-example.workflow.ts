import {
  WorkflowBase,
} from '@loopstack/core';
import {
  BlockConfig,
  Helper,
  Tool,
  WithArguments,
} from '@loopstack/common';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { CreateChatMessage } from '@loopstack/core-ui-module';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/dynamic-routing-example.workflow.yaml',
})
@WithArguments(
  z
    .object({
      value: z.number().default(150),
    })
    .strict(),
)
export class DynamicRoutingExampleWorkflow extends WorkflowBase {
  @Tool() private createChatMessage: CreateChatMessage;

  @Helper()
  gt(a: number, b: number) {
    return a > b;
  }
}
