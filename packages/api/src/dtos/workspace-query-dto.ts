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

export class WorkspaceQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkspaceFilterDto)
  filter?: WorkspaceFilterDto;

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
  @Type(() => WorkspaceSortByDto)
  sortBy?: WorkspaceSortByDto[];
}
