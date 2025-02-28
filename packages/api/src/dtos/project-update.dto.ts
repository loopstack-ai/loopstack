import {
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsOptional,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from 'class-transformer';

/**
 * Data Transfer Object for updating an existing project
 */
export class ProjectUpdateDto {
  /**
   * Human-readable title for the project
   * @example "My Updated Project"
   */
  @ValidateIf((o) => o.title !== undefined)
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Project title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable title for the project',
    example: 'My Updated Project',
  })
  title?: string;

  /**
   * Array of labels/tags associated with the project
   * @example ["frontend", "react", "typescript"]
   */
  @ValidateIf((o) => o.labels !== undefined)
  @IsArray()
  @ArrayNotEmpty({ message: 'Labels array cannot be empty' })
  @IsString({ each: true, message: 'Each label must be a string' })
  @IsOptional()
  @Type(() => String)
  @ApiPropertyOptional({
    description: 'Array of labels/tags associated with the project',
    type: 'array',
    items: { type: 'string' },
    example: ['frontend', 'customer-facing', 'high-priority'],
  })
  labels?: string[];
}