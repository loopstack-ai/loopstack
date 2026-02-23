import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import { NamespaceEntity } from '@loopstack/common';
import { SortOrder } from '../enums/sort-order.enum';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(NamespaceEntity);

export class NamespaceSortByDto {
  @IsIn(sortFields)
  @ApiProperty({ enum: sortFields })
  field: keyof NamespaceEntity;

  @IsEnum(SortOrder)
  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
