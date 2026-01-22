import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceEntity } from '@loopstack/common';
import { SortOrder } from '../enums/sort-order.enum';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(WorkspaceEntity);

export class WorkspaceSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof WorkspaceEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
