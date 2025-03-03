import { Injectable } from '@nestjs/common';
import { StateMachineValidatorInterface } from '../interfaces/state-machine-validator.interface';
import { TransitionPayloadInterface } from '@loopstack/shared';
import { StateMachineValidator } from '../decorators/state-machine-validator.decorator';
import { WorkflowEntity } from '../../persistence/entities';

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
