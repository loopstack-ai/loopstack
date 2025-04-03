import { Injectable } from '@nestjs/common';
import { StateMachineValidator, StateMachineValidatorInterface, TransitionPayloadInterface } from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@StateMachineValidator({ priority: 0 })
export class InitialRunValidator implements StateMachineValidatorInterface {
  validate(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
  ): { valid: boolean; reason: string | null } {
    const isValid = !pendingTransition && workflow.place !== 'initial';

    return { valid: isValid, reason: null };
  }
}
