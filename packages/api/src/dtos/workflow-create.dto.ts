import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import type { WorkflowCreateInterface } from '@loopstack/contracts/api';

/**
 * Data Transfer Object for creating a new workflow
 */
export class WorkflowCreateDto implements WorkflowCreateInterface {
  /**
   * Unique identifier for the workflow
   * @example "file.yaml:my-workflow"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Workflow name must not exceed 100 characters' })
  @ApiProperty({
    description: 'Process config key identifier for the workflow',
    example: 'file.yaml:my-workflow',
  })
  alias: string;

  /**
   * Human-readable title for the workflow
   * @example "My Awesome Workflow"
   */
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Workflow title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable title for the workflow',
    example: 'My Awesome Workflow',
    type: 'string',
    nullable: true,
  })
  title: string | null;

  /**
   * Array of labels/tags associated with the workflow
   * @example ["frontend", "react", "typescript"]
   */
  @ValidateIf((o: { labels?: string[] }) => o.labels !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true, message: 'Each label must be a string' })
  @Type(() => String)
  @ApiPropertyOptional({
    description: 'Array of labels/tags associated with the workflow',
    type: 'array',
    items: { type: 'string' },
    example: ['frontend', 'customer-facing', 'high-priority'],
  })
  labels?: string[];

  /**
   * UUID of the workspace the workflow belongs to
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID('4', { message: 'Workspace ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'Workspace ID is required' })
  @ApiProperty({
    description: 'UUID of the workspace the workflow belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  workspaceId: string;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Start transition for the run',
    nullable: true,
    type: 'string',
  })
  transition: string | null;

  @Expose()
  @IsOptional()
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Arguments for the workflow run',
    nullable: true,
  })
  args: any;

  @Expose()
  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Workflow context (e.g. flyInstances for Fly.io integration)',
    nullable: true,
  })
  context?: Record<string, any>;
}
