import { Expose, plainToInstance } from 'class-transformer';
import { WorkflowEntity, WorkflowState } from '@loopstack/common';

export class WorkflowStatusDto {
  @Expose()
  id: string;

  @Expose()
  status: WorkflowState;

  @Expose()
  hasError: boolean;

  @Expose()
  errorMessage: string | null;

  static create(workflow: Pick<WorkflowEntity, 'id' | 'status' | 'hasError' | 'errorMessage'>): WorkflowStatusDto {
    return plainToInstance(WorkflowStatusDto, workflow, {
      excludeExtraneousValues: true,
    });
  }
}
