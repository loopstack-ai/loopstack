import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { getEntityColumns } from '../utils/get-entity-columns.util';
import { WorkflowEntity } from '@loopstack/core';

const sortFields = getEntityColumns(WorkflowEntity);

export class WorkflowSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof WorkflowEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
