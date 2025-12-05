import { Logger } from '@nestjs/common';
import {
  createHash,
  StateMachineValidator,
  StateMachineValidatorInterface,
} from '@loopstack/common';
import { WorkflowEntity } from '@loopstack/common';

@StateMachineValidator({ priority: 200 })
export class WorkflowDependenciesValidator
  implements StateMachineValidatorInterface
{
  private readonly logger = new Logger(WorkflowDependenciesValidator.name);

  createDependenciesHash(workflow: WorkflowEntity) {
    const items = workflow.dependencies ?? [];
    const ids = items
      .filter((item) => !item.isInvalidated)
      .map((item) => item.id)
      .sort();

    return createHash(ids);
  }

  validate(workflow: WorkflowEntity): {
    valid: boolean;
    target?: string;
    hash?: string;
  } {
    const hash = workflow.hashRecord?.['dependencies'];

    if (hash) {
      const dependenciesHash = this.createDependenciesHash(workflow);

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
