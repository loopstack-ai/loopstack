import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { DocumentFilterDto } from './document-filter.dto';
import { DocumentSortByDto } from './document-sort-by.dto';

export class DocumentQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentFilterDto)
  filter?: DocumentFilterDto;

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
  @Type(() => DocumentSortByDto)
  sortBy?: DocumentSortByDto[];
}
