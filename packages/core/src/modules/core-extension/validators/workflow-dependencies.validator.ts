import { Injectable, Logger } from '@nestjs/common';
import {
  createHash,
  StateMachineValidator,
  StateMachineValidatorInterface,
} from '@loopstack/shared';
import { TransitionPayloadInterface } from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@StateMachineValidator({ priority: 200 })
export class WorkflowDependenciesValidator
  implements StateMachineValidatorInterface
{
  private readonly logger = new Logger(WorkflowDependenciesValidator.name);

  validate(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
  ): { valid: boolean; reason: string | null } {
    if (workflow.dependenciesHash !== null) {
      const ids = workflow.dependencies
        .filter((item) => item.workflowId !== null && !item.isInvalidated)
        .map((item) => item.id)
        .sort();

      const dependenciesHash = createHash(ids); // create hash from contents? so we dont need to track invalidation of entities?

      this.logger.debug(
        `Comparing workflow dependency hashes: ${(workflow.dependenciesHash !== dependenciesHash).toString()}`,
      );

      if (workflow.dependenciesHash !== dependenciesHash) {
        return { valid: false, reason: 'dependencies' };
      }
    }

    return { valid: true, reason: null };
  }
}
