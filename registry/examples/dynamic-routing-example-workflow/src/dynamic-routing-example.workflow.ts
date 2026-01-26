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
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, Helper, Tool, WithArguments } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

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
