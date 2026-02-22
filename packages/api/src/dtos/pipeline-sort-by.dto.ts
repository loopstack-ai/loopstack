import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import { PipelineEntity } from '@loopstack/common';
import { SortOrder } from '../enums/sort-order.enum';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(PipelineEntity);

export class PipelineSortByDto {
  @IsIn(sortFields)
  @ApiProperty({ enum: sortFields })
  field: keyof PipelineEntity;

  @IsEnum(SortOrder)
  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
