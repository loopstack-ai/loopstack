import {
  IsString,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  IsUUID,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from 'class-transformer';

/**
 * Data Transfer Object for creating a new project
 */
export class ProjectCreateDto {
  /**
   * Unique identifier for the project
   * @example "my-project"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Project name must not exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9-_]+$/, {
    message: 'Project name can only contain alphanumeric characters, hyphens, and underscores'
  })
  @ApiProperty({
    description: 'Unique identifier for the project',
    example: 'my-project',
  })
  name: string;

  /**
   * Human-readable title for the project
   * @example "My Awesome Project"
   */
  @ValidateIf((o) => o.title !== undefined)
  @IsString()
  @MaxLength(200, { message: 'Project title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable title for the project',
    example: 'My Awesome Project',
  })
  title?: string;

  /**
   * Array of labels/tags associated with the project
   * @example ["frontend", "react", "typescript"]
   */
  @ValidateIf((o) => o.labels !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true, message: 'Each label must be a string' })
  @Type(() => String)
  @ApiPropertyOptional({
    description: 'Array of labels/tags associated with the project',
    type: 'array',
    items: { type: 'string' },
    example: ['frontend', 'customer-facing', 'high-priority'],
  })
  labels?: string[];

  /**
   * UUID of the workspace the project belongs to
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID('4', { message: 'Workspace ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'Workspace ID is required' })
  @ApiProperty({
    description: 'UUID of the workspace the project belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  workspaceId: string;
}