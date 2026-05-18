import { Expose, plainToInstance } from 'class-transformer';
import { WorkflowEntity, WorkflowState } from '@loopstack/common';
import type { WorkflowTransitionType } from '@loopstack/contracts/types';

/**
 * Data Transfer Object representing a workflow (full detail)
 */
export class WorkflowDto {
  @Expose()
  id: string;

  /**
   * Config Key of the workflow
   */
  @Expose()
  alias: string;

  @Expose()
  className: string | null;

  @Expose()
  title: string;

  @Expose()
  run: number;

  @Expose()
  labels: string[];

  @Expose()
  status: WorkflowState;

  @Expose()
  hasError: boolean;

  @Expose()
  errorMessage: string | null;

  @Expose()
  place: string;

  @Expose()
  availableTransitions: WorkflowTransitionType[] | null;

  @Expose()
  args: any;

  @Expose()
  context: Record<string, any>;

  @Expose()
  callbackTransition: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  workspaceId: string;

  @Expose()
  parentId: string | null;

  @Expose()
  hasChildren: number;

  /**
   * Creates a WorkflowDto instance from a WorkflowEntity
   * @param workflow The workflow entity to transform
   * @returns A new WorkflowDto instance
   */
  static create(workflow: WorkflowEntity): WorkflowDto {
    return plainToInstance(WorkflowDto, workflow, {
      excludeExtraneousValues: true,
    });
  }
}
