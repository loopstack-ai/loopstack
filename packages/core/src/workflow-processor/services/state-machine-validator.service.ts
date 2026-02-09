import { Injectable, Logger } from '@nestjs/common';
import { StateMachineValidatorResultInterface, WorkflowEntity } from '@loopstack/common';
import { WorkflowExecutionContextManager } from '../utils/execution-context-manager';
import { StateMachineValidatorRegistry } from './state-machine-validator.registry';

@Injectable()
export class StateMachineValidatorService {
  private readonly logger = new Logger(StateMachineValidatorService.name);

  constructor(private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry) {}

  validate(workflowEntity: WorkflowEntity, ctx: WorkflowExecutionContextManager): StateMachineValidatorResultInterface {
    const validationResults = this.stateMachineValidatorRegistry
      .getValidators()
      .map((validator) => validator.validate(workflowEntity, ctx.getArgs()));

    return {
      valid: validationResults.every((item) => item.valid),
      hashRecordUpdates: validationResults.reduce((prev, curr) => {
        if (curr.target && curr.hash) {
          return {
            ...prev,
            [curr.target]: curr.hash,
          };
        }

        return prev;
      }, {}),
    };
  }
}
