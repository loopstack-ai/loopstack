import { Injectable, Logger } from '@nestjs/common';
import {
  StateMachineValidator,
  StateMachineValidatorInterface,
  TransitionPayloadInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@StateMachineValidator({ priority: 0 })
export class InitialRunValidator implements StateMachineValidatorInterface {
  private readonly logger = new Logger(InitialRunValidator.name);

  validate(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
  ): { valid: boolean; target?: string; hash?: string } {
    const isValid = workflow.place !== 'initial';

    this.logger.debug(`Check valid: "${isValid.toString()}".`);

    if (!isValid) {
      return { valid: false, target: 'initial' };
    }

    return { valid: true };
  }
}
