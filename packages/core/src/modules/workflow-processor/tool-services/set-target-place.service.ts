import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  ExpressionString,
  Service,
  ServiceInterface,
  ServiceCallResult,
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

@Injectable()
@Service({
  config,
  schema,
})
export class SetTargetPlaceService implements ServiceInterface {
  private readonly logger = new Logger(SetTargetPlaceService.name);

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {
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

    return {
      success: true,
      place: target,
    };
  }
}
