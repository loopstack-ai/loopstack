import {
  IsString,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  IsUUID,
  MaxLength,
  Matches,
  ValidateIf, IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Data Transfer Object for creating a new pipeline
 */
export class PipelineCreateDto {
  /**
   * Unique identifier for the pipeline
   * @example "file.yaml:my-pipeline"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Pipeline name must not exceed 100 characters' })
  @ApiProperty({
    description: 'Process config key identifier for the pipeline',
    example: 'file.yaml:my-pipeline',
  })
  configKey: string;

  /**
   * Human-readable title for the pipeline
   * @example "My Awesome Pipeline"
   */
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Pipeline title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable title for the pipeline',
    example: 'My Awesome Pipeline',
  })
  title: string | null;

  /**
   * Array of labels/tags associated with the pipeline
   * @example ["frontend", "react", "typescript"]
   */
  @ValidateIf((o) => o.labels !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true, message: 'Each label must be a string' })
  @Type(() => String)
  @ApiPropertyOptional({
    description: 'Array of labels/tags associated with the pipeline',
    type: 'array',
    items: { type: 'string' },
    example: ['frontend', 'customer-facing', 'high-priority'],
  })
  labels?: string[];

  /**
   * UUID of the workspace the pipeline belongs to
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID('4', { message: 'Workspace ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'Workspace ID is required' })
  @ApiProperty({
    description: 'UUID of the workspace the pipeline belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  workspaceId: string;
}
