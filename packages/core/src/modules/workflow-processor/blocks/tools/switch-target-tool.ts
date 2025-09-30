import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';

const SwitchTargetInputSchema = z.object({
  target: z.string(),
});

const SwitchTargetConfigSchema = z.object({
  target: z.string(),
});

type SwitchTargetInput = z.infer<typeof SwitchTargetInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Sets the target place for a transition to a defined value.',
  },
  inputSchema: SwitchTargetInputSchema,
  configSchema: SwitchTargetConfigSchema,
})
export class SwitchTarget extends Tool {
  protected readonly logger = new Logger(SwitchTarget.name);

  constructor() {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(
    ctx: ExecutionContext<SwitchTargetInput>,
  ): Promise<HandlerCallResult> {
    if (!ctx.transitionData?.transition) {
      throw new Error('No transition available.');
    }

    const target = ctx.args.target.trim();
    if (
      (Array.isArray(ctx.transitionData.to) &&
        !ctx.transitionData.to.includes(target)) ||
      (!Array.isArray(ctx.transitionData.to) &&
        ctx.transitionData.to !== target)
    ) {
      throw new Error(`Transition to ${target} not allowed.`);
    }

    this.logger.debug(`Setting transition to: ${target}`);

    return {
      success: true,
      place: target,
    };
  }
}
