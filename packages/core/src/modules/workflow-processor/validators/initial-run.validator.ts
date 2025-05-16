import { Injectable, Logger } from '@nestjs/common';
import {
  StateMachineValidator,
  StateMachineValidatorInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@StateMachineValidator({ priority: 0 })
export class InitialRunValidator implements StateMachineValidatorInterface {
  private readonly logger = new Logger(InitialRunValidator.name);

  validate(workflow: WorkflowEntity): {
    valid: boolean;
    target?: string;
    hash?: string;
  } {
    const isValid = workflow.place !== 'initial';

    this.logger.debug(`Check valid: "${isValid.toString()}".`);

    if (!isValid) {
      return { valid: false, target: 'initial' };
    }

    return { valid: true };
  }
}
