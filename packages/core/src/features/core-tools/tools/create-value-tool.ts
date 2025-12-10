import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { ToolBase } from '../../../workflow-processor';

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
    description: 'Create a value from input.',
  },
})
@WithArguments(z.object({
  input: InputSchema,
}).strict())
export class CreateValue extends ToolBase<{ input: InputType }> {
  protected readonly logger = new Logger(CreateValue.name);

  async execute(args: { input: InputType }): Promise<ToolResult> {
    this.logger.debug(`Created value: ${JSON.stringify(args.input)}`);

    return {
      data: args.input,
    };
  }
}
