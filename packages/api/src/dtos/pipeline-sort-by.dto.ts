import { ApiProperty } from '@nestjs/swagger';
import { PipelineEntity } from '@loopstack/common';
import { SortOrder } from '../enums/sort-order.enum';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(PipelineEntity);

export class PipelineSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof PipelineEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
