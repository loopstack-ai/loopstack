import { Expose, plainToInstance } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UISchemaType, WorkflowEntity, WorkflowStateHistoryDto, WorkflowStatePlaceInfoDto } from '@loopstack/shared';

/**
 * Data Transfer Object representing a workflow
 */
export class WorkflowDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the workflow',
    example: '5f8d3a9b-8b5c-4b9e-8c1a-3d9c8e6f7a2b',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Name of the workflow',
    example: 'DataProcessingWorkflow',
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
    description: 'Index position of the workflow in the pipeline sequence',
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
    description: 'Completion percentage of the workflow (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
    type: Number,
  })
  progress: number;

  @Expose()
  @ApiProperty({
    description: 'Error message if workflow execution failed',
    example: 'Failed to connect to external service',
    nullable: true,
  })
  error: string | null;

  @Expose()
  @ApiProperty({
    description: 'Indicates if the workflow is currently running',
    example: true,
    type: Boolean,
  })
  isWorking: boolean;

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
  @ApiPropertyOptional({
    type: WorkflowStateHistoryDto,
    description: 'History of state transitions within the workflow',
    nullable: true,
  })
  transitionHistory: WorkflowStateHistoryDto | null;

  @Expose()
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Ui schema config for the workflow',
    nullable: true,
  })
  ui: UISchemaType | null;

  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Date and time when the workflow was created',
    example: '2023-01-15T14:30:45.123Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Date and time when the workflow was last updated',
    example: '2023-01-16T09:12:33.456Z',
  })
  updatedAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the workspace this workflow belongs to',
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
