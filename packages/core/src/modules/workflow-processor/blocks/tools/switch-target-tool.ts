import { BlockConfig, HandlerCallResult, TemplateExpression } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';

const SwitchTargetInputSchema = z.object({
  target: z.string(),
});

const SwitchTargetConfigSchema = z.object({
  target: TemplateExpression,
});

type SwitchTargetInput = z.infer<typeof SwitchTargetInputSchema>;

@BlockConfig({
  config: {
    description: 'Sets the target place for a transition to a defined value.',
  },
  properties: SwitchTargetInputSchema,
  configSchema: SwitchTargetConfigSchema,
})
export class SwitchTarget extends Tool {
  protected readonly logger = new Logger(SwitchTarget.name);

  async execute(): Promise<HandlerCallResult> {
    const target = this.args.target.trim();
    if (
      (Array.isArray(this.state.transition!.to) &&
        !this.state.transition!.to.includes(target)) ||
      (!Array.isArray(this.state.transition!.to) &&
        this.state.transition!.to !== target)
    ) {
      throw new Error(`Transition to place "${target}" not allowed.`);
    }

    this.logger.debug(`Setting transition to: ${target}`);

    return {
      success: true,
      effects: {
        setTransitionPlace: target
      },
    };
  }
}
