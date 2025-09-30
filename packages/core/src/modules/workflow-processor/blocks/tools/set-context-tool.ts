/* eslint-disable @typescript-eslint/require-await */
import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { WorkflowContextService } from '../../services';

const SetContextInputSchema = z.object({
  key: z.string(),
  value: z.any(),
});

const SetContextConfigSchema = z.object({
  key: z.string(),
  value: z.any(),
});

type SetContextInput = z.infer<typeof SetContextInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Set a context.',
  },
  inputSchema: SetContextInputSchema,
  configSchema: SetContextConfigSchema,
})
export class SetContext extends Tool {
  protected readonly logger = new Logger(SetContext.name);

  constructor(private readonly workflowContextService: WorkflowContextService) {
    super();
  }

  async execute(
    ctx: ExecutionContext<SetContextInput>,
  ): Promise<HandlerCallResult> {
    const updatedWorkflow =
      this.workflowContextService.setWorkflowContextUpdate(
        ctx.workflow,
        ctx.args.key,
        ctx.args.value,
      );

    this.logger.debug(`Created context key "${ctx.args.key}".`);

    return {
      success: true,
      workflow: updatedWorkflow,
    };
  }
}
