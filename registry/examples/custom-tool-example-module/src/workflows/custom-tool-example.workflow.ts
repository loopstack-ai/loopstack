/*
Copyright 2025 The Loopstack Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

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
