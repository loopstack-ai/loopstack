import { Injectable, Logger } from '@nestjs/common';

import {
  StateMachineValidatorResultInterface,
  WorkflowEntity,
} from '@loopstack/common';
import { StateMachineValidatorRegistry } from './state-machine-validator.registry';

@Injectable()
export class StateMachineValidatorService {
  private readonly logger = new Logger(StateMachineValidatorService.name);

  constructor(
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
  ) {}

  validate(
    workflow: WorkflowEntity,
    args: Record<string, any> | undefined,
  ): StateMachineValidatorResultInterface {
    const validationResults = this.stateMachineValidatorRegistry
      .getValidators()
      .map((validator) => validator.validate(workflow, args));

    return {
      valid: validationResults.every((item) => item.valid),
      hashRecordUpdates: validationResults.reduce((prev, curr) => {
        if (curr.target && curr.hash) {
          return {
            ...prev,
            [curr.target as string]: curr.hash,
          };
        }

        return prev;
      }, {}),
    };
  }
}
