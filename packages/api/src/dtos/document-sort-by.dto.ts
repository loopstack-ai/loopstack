import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentEntityInterface } from '@loopstack/shared';

export class DocumentSortByDto {
  @ApiProperty({ enum: [] })
  field: keyof DocumentEntityInterface;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
