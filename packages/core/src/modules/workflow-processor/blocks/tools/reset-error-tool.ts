import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';

const ResetErrorInputSchema = z.object({});

const ResetErrorConfigSchema = z.object({});

type ResetErrorInput = z.infer<typeof ResetErrorInputSchema>;

@BlockConfig({
  config: {
    description: 'Reset the error state of the workflow.',
  },
  properties: ResetErrorInputSchema,
  configSchema: ResetErrorConfigSchema,
})
export class ResetError extends Tool {
  protected readonly logger = new Logger(ResetError.name);

  constructor() {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(): Promise<HandlerCallResult> {
    if (!this.state.id) {
      throw new Error('Workflow is undefined');
    }

    // this.state.error = undefined;

    return {
      success: true,
      // workflow: toolProcessor.ctx.state.workflow,
    };
  }
}
