import {
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkspaceFilterDto } from './workspace-filter.dto';
import { WorkspaceSortByDto } from './workspace-sort-by.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WorkspaceQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkspaceFilterDto)
  @ApiPropertyOptional({ type: WorkspaceFilterDto })
  filter?: WorkspaceFilterDto;

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
  @Type(() => WorkspaceSortByDto)
  @ApiPropertyOptional({ isArray: true, type: WorkspaceSortByDto })
  sortBy?: WorkspaceSortByDto[];
}
