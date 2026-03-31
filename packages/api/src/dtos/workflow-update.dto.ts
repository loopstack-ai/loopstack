import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import type { WorkflowUpdateInterface } from '@loopstack/contracts/api';

/**
 * Data Transfer Object for updating an existing workflow
 */
export class WorkflowUpdateDto implements WorkflowUpdateInterface {
  /**
   * Human-readable title for the workflow
   * @example "My Updated Workflow"
   */
  @ValidateIf((o: { title?: string }) => o.title !== undefined)
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Workflow title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable title for the workflow',
    example: 'My Updated Workflow',
  })
  title?: string;

  /**
   * Array of labels/tags associated with the workflow
   * @example ["frontend", "react", "typescript"]
   */
  @ValidateIf((o: { labels?: string }) => o.labels !== undefined)
  @IsArray()
  @ArrayNotEmpty({ message: 'Labels array cannot be empty' })
  @IsString({ each: true, message: 'Each label must be a string' })
  @IsOptional()
  @Type(() => String)
  @ApiPropertyOptional({
    description: 'Array of labels/tags associated with the workflow',
    type: 'array',
    items: { type: 'string' },
    example: ['frontend', 'customer-facing', 'high-priority'],
  })
  labels?: string[];
}
