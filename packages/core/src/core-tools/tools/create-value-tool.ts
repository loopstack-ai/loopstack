import { BlockConfig, HandlerCallResult } from '@loopstack/common';
import { z } from 'zod';
import { Logger } from '@nestjs/common';
import { Tool } from '../../workflow-processor';
import { TemplateExpression } from '@loopstack/contracts/schemas';

@BlockConfig({
  config: {
    description: 'Create a value from input.',
  },
  properties: z
    .object({
      input: z.any(),
    })
    .strict(),
  configSchema: z
    .object({
      input: z.union([
        TemplateExpression,
        z.any(),
      ]),
    })
    .strict(),
})
export class CreateValue extends Tool {
  protected readonly logger = new Logger(CreateValue.name);

  async execute(): Promise<HandlerCallResult> {
    this.logger.debug(`Created value: ${JSON.stringify(this.args.input)}`);

    return {
      data: this.args.input,
    }
  }
}

