import {
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectFilterDto } from './project-filter.dto';
import { ProjectSortByDto } from './project-sort-by.dto';

export class ProjectQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectFilterDto)
  filter?: ProjectFilterDto;

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
  @Type(() => ProjectSortByDto)
  sortBy?: ProjectSortByDto[];
}
