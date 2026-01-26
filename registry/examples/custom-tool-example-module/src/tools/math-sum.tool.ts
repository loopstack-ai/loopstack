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
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';
import { ToolBase } from '@loopstack/core';
import { MathService } from '../services/math.service';

const propertiesSchema = z
  .object({
    a: z.number(),
    b: z.number(),
  })
  .strict();

export type MathSumArgs = z.infer<typeof propertiesSchema>;

@Injectable()
@BlockConfig({
  config: {
    description: 'Math tool calculating the sum of two arguments by using an injected service.',
  },
})
@WithArguments(propertiesSchema)
export class MathSumTool extends ToolBase<MathSumArgs> {
  @Inject()
  private mathService: MathService;

  async execute(args: MathSumArgs): Promise<ToolResult<number>> {
    const sum = this.mathService.sum(args.a, args.b);
    return {
      data: sum,
    };
  }
}
