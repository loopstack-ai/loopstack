import {
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentSortByDto } from './document-sort-by.dto';
import { DocumentFilterDto } from './document-filter.dto';

export class DocumentQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentFilterDto)
  @ApiPropertyOptional({ type: DocumentFilterDto })
  filter?: DocumentFilterDto;

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
  @Type(() => DocumentSortByDto)
  @ApiPropertyOptional({ isArray: true, type: DocumentSortByDto })
  sortBy?: DocumentSortByDto[];
}
