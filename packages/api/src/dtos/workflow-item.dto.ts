import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { WorkflowEntity, WorkflowState } from '@loopstack/common';

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
  @ApiPropertyOptional({
    description: 'Class name of the workflow (for config lookups)',
    example: 'AutomationBuilderWorkflow',
    nullable: true,
  })
  className: string | null;

  @Expose()
  @ApiProperty({
    description: 'Display title of the workflow',
    example: 'My workflow',
  })
  title: string;

  @Expose()
  @ApiProperty({
    description: 'Run number for identification if no title is given.',
    example: 123,
  })
  run: number;

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
    enum: WorkflowState,
    enumName: 'WorkflowState',
    description: 'Current status of the workflow',
  })
  status: WorkflowState;

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
  @ApiPropertyOptional({
    description: 'ID of parent workflow. Is null for root workflows',
    nullable: true,
  })
  parentId: string | null;

  @Expose()
  @ApiProperty({
    type: 'number',
    description: 'Number of child workflows',
    example: 0,
  })
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
