import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { WorkflowEntity } from '@loopstack/shared';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(WorkflowEntity);

export class WorkflowSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof WorkflowEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
