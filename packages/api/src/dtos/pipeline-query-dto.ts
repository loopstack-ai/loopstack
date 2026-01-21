import {
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PipelineFilterDto } from './pipeline-filter.dto';
import { PipelineSortByDto } from './pipeline-sort-by.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
