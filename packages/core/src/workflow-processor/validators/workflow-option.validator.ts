import { Logger } from '@nestjs/common';
import { StateMachineValidator, StateMachineValidatorInterface, generateObjectFingerprint } from '@loopstack/common';
import { WorkflowEntity } from '@loopstack/common';

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
