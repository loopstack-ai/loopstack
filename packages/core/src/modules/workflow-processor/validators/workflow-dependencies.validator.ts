import { Injectable, Logger } from '@nestjs/common';
import {
  createHash,
  StateMachineValidator,
  StateMachineValidatorInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@StateMachineValidator({ priority: 200 })
export class WorkflowDependenciesValidator
  implements StateMachineValidatorInterface
{
  private readonly logger = new Logger(WorkflowDependenciesValidator.name);

  validate(
    workflow: WorkflowEntity,
  ): { valid: boolean; target?: string; hash?: string } {
    const hash = workflow.hashRecord?.['dependencies'];

    if (hash) {
      const ids = workflow.dependencies
        .filter((item) => item.workflowId !== null && !item.isInvalidated)
        .map((item) => item.id)
        .sort();

      const dependenciesHash = createHash(ids); // create hash from contents? so we dont need to track invalidation of entities?

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
