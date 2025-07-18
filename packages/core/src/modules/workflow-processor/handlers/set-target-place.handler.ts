import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Handler,
  HandlerInterface,
  HandlerCallResult,
  TransitionMetadataInterface,
  WorkflowEntity,
} from '@loopstack/shared';

const config = z
  .object({
    target: z.string(),
  })
  .strict();

const schema = z
  .object({
    target: z.string(),
  })
  .strict();

@Handler({
  config,
  schema,
})
export class SetTargetPlaceHandler implements HandlerInterface {
  private readonly logger = new Logger(SetTargetPlaceHandler.name);

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
  ): Promise<HandlerCallResult> {
    if (!transitionData.transition) {
      throw new Error('No transition available.');
    }

    const target = props.target.trim();
    if (
      (Array.isArray(transitionData.to) &&
        !transitionData.to.includes(target)) ||
      (!Array.isArray(transitionData.to) && transitionData.to !== target)
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
