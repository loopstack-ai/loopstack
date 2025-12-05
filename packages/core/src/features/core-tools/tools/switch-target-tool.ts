import { BlockConfig, HandlerCallResult } from '@loopstack/common';
import { TemplateExpression } from '@loopstack/contracts/schemas';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../../workflow-processor';

const SwitchTargetInputSchema = z
  .object({
    target: z.string(),
  })
  .strict();

const SwitchTargetConfigSchema = z
  .object({
    target: z.union([z.string(), TemplateExpression]),
  })
  .strict();

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
      (Array.isArray(this.ctx.workflow.transition!.to) &&
        !this.ctx.workflow.transition!.to.includes(target)) ||
      (!Array.isArray(this.ctx.workflow.transition!.to) &&
        this.ctx.workflow.transition!.to !== target)
    ) {
      throw new Error(`Transition to place "${target}" not allowed.`);
    }

    this.logger.debug(`Setting transition to: ${target}`);

    return {
      effects: {
        setTransitionPlace: target,
      },
    };
  }
}
