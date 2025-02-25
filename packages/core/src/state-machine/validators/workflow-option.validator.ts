import { Injectable } from '@nestjs/common';
import { StateMachineValidatorInterface } from '../interfaces/state-machine-validator.interface';
import { generateObjectFingerprint } from '@loopstack/shared/dist/utils/object-fingerprint.util';
import { TransitionPayloadInterface } from '../interfaces/transition-payload.interface';
import { StateMachineValidator } from '../decorators/state-machine-validator.decorator';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

@Injectable()
@StateMachineValidator({ priority: 100 })
export class WorkflowOptionValidator implements StateMachineValidatorInterface {
  validate(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
    options: Record<string, any>,
  ): { valid: boolean; reason: string | null } {
    const optionsHash = generateObjectFingerprint(options);

    console.log(
      `Checking option invalidation: ${(workflow.optionsHash !== optionsHash).toString()}`,
    );

    if (workflow.optionsHash !== optionsHash) {
      return { valid: false, reason: 'options' };
    }

    return { valid: true, reason: null };
  }
}
