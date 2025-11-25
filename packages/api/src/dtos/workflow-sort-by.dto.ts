import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { WorkflowEntity } from '@loopstack/common';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(WorkflowEntity);

export class WorkflowSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof WorkflowEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
