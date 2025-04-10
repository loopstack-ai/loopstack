import { Injectable } from '@nestjs/common';
import {
  generateObjectFingerprint,
  StateMachineValidator,
  StateMachineValidatorInterface,
} from '@loopstack/shared';
import { TransitionPayloadInterface } from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@StateMachineValidator({ priority: 100 })
export class WorkflowOptionValidator implements StateMachineValidatorInterface {
  validate(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
    options: Record<string, any> | undefined,
  ): { valid: boolean; target?: string; hash?: string; } {
    if (options) {
      const hash = workflow.hashRecord?.['options'];
      const optionsHash = generateObjectFingerprint(options);

      console.log(
        `Checking option invalidation for ${workflow.name}: ${hash} === ${optionsHash} ==> ${(hash === optionsHash).toString()}`,
      );

      if (hash !== optionsHash) {
        return { valid: false, target: 'options', hash: optionsHash };
      }
    }

    return { valid: true };
  }
}
