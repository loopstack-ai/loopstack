import { Logger } from '@nestjs/common';
import { StateMachineValidator, StateMachineValidatorInterface } from '@loopstack/common';
import { WorkflowEntity } from '@loopstack/common';

@StateMachineValidator({ priority: 0 })
export class InitialRunValidator implements StateMachineValidatorInterface {
  private readonly logger = new Logger(InitialRunValidator.name);

  validate(workflow: WorkflowEntity): {
    valid: boolean;
    target?: string;
    hash?: string;
  } {
    const isValid = workflow.place !== 'start';

    this.logger.debug(`Check valid: "${isValid.toString()}".`);

    if (!isValid) {
      return { valid: false, target: 'start' };
    }

    return { valid: true };
  }
}
