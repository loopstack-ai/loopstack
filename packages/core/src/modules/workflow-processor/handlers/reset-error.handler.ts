import { Logger } from '@nestjs/common';
import {
  Handler,
  HandlerInterface,
  HandlerCallResult,
  WorkflowEntity,
} from '@loopstack/shared';

@Handler({})
export class ResetErrorHandler implements HandlerInterface {
  private readonly logger = new Logger(ResetErrorHandler.name);

  async apply(
    props: any,
    workflow: WorkflowEntity | undefined,
  ): Promise<HandlerCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    workflow.error = null;

    return {
      success: true,
      workflow,
    };
  }
}
