import { Injectable, Logger } from '@nestjs/common';
import {
  generateObjectFingerprint,
  StateMachineValidator,
  StateMachineValidatorInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@StateMachineValidator({ priority: 100 })
export class WorkflowOptionValidator implements StateMachineValidatorInterface {
  private readonly logger = new Logger(WorkflowOptionValidator.name);

  validate(
    workflow: WorkflowEntity,
    args: Record<string, any> | undefined,
  ): { valid: boolean; target?: string; hash?: string } {
    if (args) {
      const hash = workflow.hashRecord?.['options'];
      const optionsHash = generateObjectFingerprint(args);

      this.logger.debug(`Check valid: "${(hash === optionsHash).toString()}".`);

      if (hash !== optionsHash) {
        return { valid: false, target: 'options', hash: optionsHash };
      }
    }

    return { valid: true };
  }
}
