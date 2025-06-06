import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  ExpressionString,
  NonExpressionString,
  Service,
  ServiceInterface,
  ServiceCallResult, TransitionMetadataInterface, WorkflowEntity,
} from '@loopstack/shared';

const config = z
  .object({
    target: ExpressionString,
  })
  .strict();

const schema = z
  .object({
    target: NonExpressionString,
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
    meta: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {

    if (!meta.transition) {
      throw new Error('No transition available.')
    }

    if (
      (Array.isArray(meta.to) && !meta.to.includes(props.target))
        || (!Array.isArray(meta.to) && meta.to !== props.target)
      ) {
      throw new Error(`Transition to ${props.target} not allowed.`);
    }

    return {
      success: true,
      place: props.target,
    };
  }
}
