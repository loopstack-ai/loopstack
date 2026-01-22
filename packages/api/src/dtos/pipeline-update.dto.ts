import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

/**
 * Data Transfer Object for updating an existing pipeline
 */
export class PipelineUpdateDto {
  /**
   * Human-readable title for the pipeline
   * @example "My Updated Pipeline"
   */
  @ValidateIf((o: { title?: string }) => o.title !== undefined)
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Pipeline title must not exceed 200 characters' })
  @ApiPropertyOptional({
    description: 'Human-readable title for the pipeline',
    example: 'My Updated Pipeline',
  })
  title?: string;

  /**
   * Array of labels/tags associated with the pipeline
   * @example ["frontend", "react", "typescript"]
   */
  @ValidateIf((o: { labels?: string }) => o.labels !== undefined)
  @IsArray()
  @ArrayNotEmpty({ message: 'Labels array cannot be empty' })
  @IsString({ each: true, message: 'Each label must be a string' })
  @IsOptional()
  @Type(() => String)
  @ApiPropertyOptional({
    description: 'Array of labels/tags associated with the pipeline',
    type: 'array',
    items: { type: 'string' },
    example: ['frontend', 'customer-facing', 'high-priority'],
  })
  labels?: string[];
}
