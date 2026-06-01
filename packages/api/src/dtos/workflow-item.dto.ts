import { Expose, plainToInstance } from 'class-transformer';
import { WorkflowEntity, WorkflowState } from '@loopstack/common';

/**
 * Data Transfer Object representing a workflow item
 */
export class WorkflowItemDto {
  @Expose()
  id: string;

  /**
   * Config Key of the workflow
   */
  @Expose()
  workflowName: string;

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
  place: string;

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
   * Creates a WorkflowItemDto instance from a WorkflowEntity
   * @param workflow The workflow entity to transform
   * @returns A new WorkflowItemDto instance
   */
  static create(workflow: WorkflowEntity): WorkflowItemDto {
    return plainToInstance(WorkflowItemDto, workflow, {
      excludeExtraneousValues: true,
    });
  }
}
