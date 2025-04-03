import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { WorkflowEntityInterface } from '@loopstack/shared';

export class WorkflowSortByDto {
  @ApiProperty({ enum: [] })
  field: keyof WorkflowEntityInterface;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
