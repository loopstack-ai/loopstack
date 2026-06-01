import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { BaseWorkflow, getWorkflowIdentifier } from '@loopstack/common';

/**
 * Pipe that resolves a snake_case workflow name param to its class reference.
 * Validates that the name is in the allowed list and throws 404 if not found.
 *
 * Usage:
 *   @Param('workflowName', new ResolveWorkflowPipe(ALLOWED_WORKFLOWS)) workflowClass: Type<BaseWorkflow>
 */
@Injectable()
export class ResolveWorkflowPipe implements PipeTransform<string, Type<BaseWorkflow>> {
  private readonly byIdentifier: Map<string, Type<BaseWorkflow>>;

  constructor(workflows: Type<BaseWorkflow>[]) {
    this.byIdentifier = new Map(workflows.map((wf) => [getWorkflowIdentifier(wf.prototype as object), wf]));
  }

  transform(value: string): Type<BaseWorkflow> {
    const workflowClass = this.byIdentifier.get(value);
    if (!workflowClass) {
      throw new NotFoundException(
        `Workflow "${value}" not found. Available: ${[...this.byIdentifier.keys()].join(', ')}`,
      );
    }
    return workflowClass;
  }
}
