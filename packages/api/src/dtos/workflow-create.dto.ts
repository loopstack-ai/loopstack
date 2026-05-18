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
  alias: string;

  /**
   * Human-readable title for the workflow
   * @example "My Awesome Workflow"
   */
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Workflow title must not exceed 200 characters' })
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
  labels?: string[];

  /**
   * UUID of the workspace the workflow belongs to
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID('4', { message: 'Workspace ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'Workspace ID is required' })
  workspaceId: string;

  @Expose()
  @IsString()
  @IsOptional()
  transition: string | null;

  @Expose()
  @IsOptional()
  args: any;

  @Expose()
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
