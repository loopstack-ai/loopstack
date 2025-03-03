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
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectFilterDto)
  @ApiPropertyOptional({ type: ProjectFilterDto })
  filter?: ProjectFilterDto;

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
  @Type(() => ProjectSortByDto)
  @ApiPropertyOptional({ isArray: true, type: ProjectSortByDto })
  sortBy?: ProjectSortByDto[];
}
