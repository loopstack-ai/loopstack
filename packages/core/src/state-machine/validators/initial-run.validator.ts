import { Injectable } from '@nestjs/common';
import { StateMachineValidatorInterface } from '../interfaces/state-machine-validator.interface';
import { TransitionPayloadInterface } from '../interfaces/transition-payload.interface';
import { StateMachineValidator } from '../decorators/state-machine-validator.decorator';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

@Injectable()
@StateMachineValidator({ priority: 0 })
export class InitialRunValidator implements StateMachineValidatorInterface {
  validate(
    pendingWorkflowTransitions: TransitionPayloadInterface[],
    workflow: WorkflowEntity,
    options: Record<string, any>,
  ): { valid: boolean; reason: string | null } {
    const isValid =
      pendingWorkflowTransitions.length === 0 &&
      workflow.state.place !== 'initial';

    return { valid: isValid, reason: null };
  }
}
