import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { PipelineState, WorkflowEntity, WorkflowState } from '@loopstack/common';

/**
 * Data Transfer Object representing a workflow item
 */
export class WorkflowItemDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the workflow item',
    example: '5f8d3a9b-8b5c-4b9e-8c1a-3d9c8e6f7a2b',
  })
  id: string;

  /**
   * Config Key of the workflow
   */
  @Expose()
  @ApiProperty({
    description: 'Config key of the workflow',
    example: 'file.yaml:my-workflow',
  })
  blockName: string;

  @Expose()
  @ApiProperty({
    description: 'Display title of the workflow',
    example: 'My workflow',
  })
  title: string;

  @Expose()
  @ApiProperty({
    description: 'Index position of the workflow item in a sequence',
    example: 1,
    type: Number,
  })
  index: number;

  @Expose()
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    description: 'Tags associated with the workflow for categorization and filtering',
    example: ['frontend', 'featureXY'],
  })
  labels: string[];

  @Expose()
  @ApiProperty({
    description: 'Completion percentage of the workflow item (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
    type: Number,
  })
  progress: number;

  @Expose()
  @ApiProperty({
    enum: WorkflowState,
    enumName: 'WorkflowState',
    description: 'Current status of the workflow',
  })
  status: PipelineState;

  @Expose()
  @ApiProperty({
    type: 'boolean',
    nullable: false,
  })
  hasError: boolean;

  @Expose()
  @ApiProperty({
    description: 'Current place in the workflow state machine',
    example: 'approval_pending',
  })
  place: string;

  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Date and time when the workflow item was created',
    example: '2023-01-15T14:30:45.123Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Date and time when the workflow item was last updated',
    example: '2023-01-16T09:12:33.456Z',
  })
  updatedAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the workspace this workflow item belongs to',
    example: '9i8h7g6f-5e4d-3c2b-1a0z-9y8x7w6v5u4t',
  })
  workspaceId: string;

  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the pipeline this workflow belongs to',
    example: '9i8h7g6f-5e4d-3c2b-1a0z-9y8x7w6v5u4t',
  })
  pipelineId: string;

  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the namespace this workflow belongs to',
    example: '9i8h7g6f-5e4d-3c2b-1a0z-9y8x7w6v5u4t',
  })
  namespaceId: string;

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
