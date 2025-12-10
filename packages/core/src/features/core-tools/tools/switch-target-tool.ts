import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { ToolBase } from '../../../workflow-processor';
import { WorkflowExecution } from '../../../workflow-processor/interfaces/workflow-execution.interface';

const SwitchTargetInputSchema = z
  .object({
    target: z.string(),
  })
  .strict();

type SwitchTargetInput = z.infer<typeof SwitchTargetInputSchema>;

@Injectable()
@BlockConfig({
  config: {
    description: 'Sets the target place for a transition to a defined value.',
  },
})
@WithArguments(SwitchTargetInputSchema)
export class SwitchTarget extends ToolBase<SwitchTargetInput> {
  protected readonly logger = new Logger(SwitchTarget.name);

  async execute(args: SwitchTargetInput, ctx: WorkflowExecution): Promise<ToolResult> {
    const target = args.target.trim();
    const transition = ctx.runtime.transition!;
    if (
      (Array.isArray(transition.to) &&
        !transition.to.includes(target)) ||
      (!Array.isArray(transition.to) &&
        transition.to !== target)
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
