import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { getEntityColumns } from '../utils/get-entity-columns.util';
import {NamespaceEntity} from "@loopstack/core/dist";

const sortFields = getEntityColumns(NamespaceEntity);

export class NamespaceSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof NamespaceEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
