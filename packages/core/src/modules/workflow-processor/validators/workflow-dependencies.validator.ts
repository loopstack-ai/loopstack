import { Injectable, Logger } from '@nestjs/common';
import {
  StateMachineValidator,
  StateMachineValidatorInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { WorkflowService } from '../../persistence';

@Injectable()
@StateMachineValidator({ priority: 200 })
export class WorkflowDependenciesValidator
  implements StateMachineValidatorInterface
{
  private readonly logger = new Logger(WorkflowDependenciesValidator.name);

  constructor(private workflowService: WorkflowService) {}

  validate(workflow: WorkflowEntity): {
    valid: boolean;
    target?: string;
    hash?: string;
  } {
    const hash = workflow.hashRecord?.['dependencies'];

    if (hash) {
      const dependenciesHash =
        this.workflowService.createDependenciesHash(workflow);

      this.logger.debug(
        `Check valid: ${(hash === dependenciesHash).toString()}`,
      );

      if (hash !== dependenciesHash) {
        return { valid: false, target: 'dependencies', hash: dependenciesHash };
      }
    }

    return { valid: true };
  }
}
