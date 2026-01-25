import { ApiProperty } from '@nestjs/swagger';
import { NamespaceEntity } from '@loopstack/common';
import { SortOrder } from '../enums/sort-order.enum';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(NamespaceEntity);

export class NamespaceSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof NamespaceEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
