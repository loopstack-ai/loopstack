import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { WorkflowFilterDto } from './workflow-filter.dto';
import { WorkflowSortByDto } from './workflow-sort-by.dto';

export class WorkflowQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowFilterDto)
  filter?: WorkflowFilterDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowSortByDto)
  sortBy?: WorkflowSortByDto[];
}
