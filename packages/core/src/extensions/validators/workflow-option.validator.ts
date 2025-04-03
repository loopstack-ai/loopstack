import { Injectable } from '@nestjs/common';
import { generateObjectFingerprint, StateMachineValidator, StateMachineValidatorInterface } from '@loopstack/shared';
import { TransitionPayloadInterface } from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@StateMachineValidator({ priority: 100 })
export class WorkflowOptionValidator implements StateMachineValidatorInterface {
  validate(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
    options: Record<string, any> | undefined,
  ): { valid: boolean; reason: string | null } {
    if (options) {
      const optionsHash = generateObjectFingerprint(options);

      console.log(
        `Checking option invalidation: ${(workflow.optionsHash !== optionsHash).toString()}`,
      );

      if (workflow.optionsHash !== optionsHash) {
        return { valid: false, reason: 'options' };
      }
    }

    return { valid: true, reason: null };
  }
}
