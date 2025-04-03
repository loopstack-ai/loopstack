import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { NamespaceEntityInterface } from '@loopstack/shared';

export class NamespaceSortByDto {
  @ApiProperty({ enum: [] })
  field: keyof NamespaceEntityInterface;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
