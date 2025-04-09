import { Injectable } from '@nestjs/common';
import {
  StateMachineValidator,
  StateMachineValidatorInterface,
  TransitionPayloadInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@StateMachineValidator({ priority: 0 })
export class InitialRunValidator implements StateMachineValidatorInterface {
  validate(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
  ): { valid: boolean; target?: string; hash?: string; } {
    const isValid = !pendingTransition && workflow.place !== 'initial';
    if (!isValid) {
      return { valid: false, target: 'initial' };
    }

    return { valid: true };
  }
}
