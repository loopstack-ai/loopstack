import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';

const ResetErrorInputSchema = z.object({});

const ResetErrorConfigSchema = z.object({});

type ResetErrorInput = z.infer<typeof ResetErrorInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Reset the error state of the workflow.',
  },
  inputSchema: ResetErrorInputSchema,
  configSchema: ResetErrorConfigSchema,
})
export class ResetError extends Tool {
  protected readonly logger = new Logger(ResetError.name);

  constructor() {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(
    ctx: ExecutionContext<ResetErrorInput>,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    ctx.workflow.error = null;

    return {
      success: true,
      workflow: ctx.workflow,
    };
  }
}
