import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectEntityInterface } from '@loopstack/shared';

export class ProjectSortByDto {
  @ApiProperty({ enum: [] })
  field: keyof ProjectEntityInterface;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
