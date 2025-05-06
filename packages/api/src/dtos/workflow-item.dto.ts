import { Expose, plainToInstance } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowEntity, WorkflowStatePlaceInfoDto } from '@loopstack/shared';

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

  @Expose()
  @ApiProperty({
    description: 'Name of the workflow item',
    example: 'Data Processing Workflow',
  })
  name: string;

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
    description:
        'Tags associated with the workflow for categorization and filtering',
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
    description: 'Error message if workflow item execution failed',
    example: 'Failed to connect to external service',
    nullable: true,
  })
  error: string | null;

  @Expose()
  @ApiProperty({
    description: 'Indicates if the workflow item is currently running',
    example: true,
    type: Boolean,
  })
  isWorking: boolean;

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
    description: 'Current place in the workflow state machine',
    example: 'approval_pending',
  })
  place: string;

  @Expose()
  @ApiPropertyOptional({
    type: WorkflowStatePlaceInfoDto,
    description:
      'Additional information about the current place in the workflow',
    nullable: true,
  })
  placeInfo: WorkflowStatePlaceInfoDto | null;

  @Expose()
  @ApiProperty({
    description:
      'Unique identifier of the workspace this workflow item belongs to',
    example: '9i8h7g6f-5e4d-3c2b-1a0z-9y8x7w6v5u4t',
  })
  workspaceId: string;

  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the project this workflow belongs to',
    example: '9i8h7g6f-5e4d-3c2b-1a0z-9y8x7w6v5u4t',
  })
  projectId: string;

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
