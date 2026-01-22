import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { PipelineFilterDto } from './pipeline-filter.dto';
import { PipelineSortByDto } from './pipeline-sort-by.dto';

export class PipelineQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PipelineFilterDto)
  @ApiPropertyOptional({ type: PipelineFilterDto })
  filter?: PipelineFilterDto;

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
  @Type(() => PipelineSortByDto)
  @ApiPropertyOptional({ isArray: true, type: PipelineSortByDto })
  sortBy?: PipelineSortByDto[];
}
