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
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';
import { ToolBase } from '@loopstack/core';

const InputSchema = z.union([
  z.string(),
  z.number(),
  z.object({}).passthrough(),
  z.array(z.unknown()),
  z.null(),
  z.boolean(),
]);

type InputType = z.infer<typeof InputSchema>;

@Injectable()
@BlockConfig({
  config: {
    description:
      'Creates a value from an expression input. This tool is helpful to debug a template expression or value in a workflow. Also it can be used to reassign a value to another using a template expression.',
  },
})
@WithArguments(
  z
    .object({
      input: InputSchema,
    })
    .strict(),
)
export class CreateValue extends ToolBase<{ input: InputType }> {
  protected readonly logger = new Logger(CreateValue.name);

  execute(args: { input: InputType }): Promise<ToolResult> {
    this.logger.debug(`Created value: ${JSON.stringify(args.input)}`);

    return Promise.resolve({
      data: args.input,
    });
  }
}
