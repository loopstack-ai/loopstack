import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { WorkflowFilterDto } from './workflow-filter.dto';
import { WorkflowSortByDto } from './workflow-sort-by.dto';

export class WorkflowQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowFilterDto)
  @ApiPropertyOptional({ type: WorkflowFilterDto })
  filter?: WorkflowFilterDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiPropertyOptional()
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiPropertyOptional()
  limit?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowSortByDto)
  @ApiPropertyOptional({ isArray: true, type: WorkflowSortByDto })
  sortBy?: WorkflowSortByDto[];
}
