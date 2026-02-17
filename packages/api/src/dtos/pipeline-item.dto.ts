import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { PipelineEntity, PipelineState } from '@loopstack/common';

/**
 * Data Transfer Object for Pipeline item listing
 */
export class PipelineItemDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the pipeline',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  /**
   * Config Key of the pipeline
   */
  @Expose()
  @ApiProperty({
    description: 'Config key of the pipeline',
    example: 'file.yaml:my-pipeline',
  })
  blockName: string;

  @Expose()
  @ApiProperty({
    description: 'Display title of the pipeline',
    example: 'Customer Portal',
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
    description: 'Tags associated with the pipeline for categorization and filtering',
    example: ['frontend', 'featureXY'],
  })
  labels: string[];

  @Expose()
  @ApiProperty({
    description: 'Order position of the pipeline in listings',
    example: 1,
  })
  order: number;

  @Expose()
  @ApiProperty({
    enum: PipelineState,
    enumName: 'PipelineStatus',
    description: 'Current status of the pipeline',
  })
  status: PipelineState;

  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Timestamp when the pipeline was created',
    example: '2023-01-15T14:30:00Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Timestamp when the pipeline was last updated',
    example: '2023-02-20T09:15:30Z',
  })
  updatedAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Identifier of the workspace that contains this pipeline',
    example: '789e4567-e89b-12d3-a456-426614174001',
  })
  workspaceId: string;

  @Expose()
  @ApiProperty({
    description: 'ID of parent pipeline. Is Null for root pipelines',
  })
  parentId: string | null;

  @Expose()
  @ApiProperty({
    type: 'number',
    description: 'Number of child pipelines',
    example: 0,
  })
  hasChildren: number;

  /**
   * Creates a PipelineItemDto instance from a PipelineEntity
   * @param pipeline The source PipelineEntity to transform
   * @returns A new PipelineItemDto instance with values from the PipelineEntity
   */
  static create(pipeline: PipelineEntity): PipelineItemDto {
    return plainToInstance(PipelineItemDto, pipeline, {
      excludeExtraneousValues: true,
    });
  }
}
