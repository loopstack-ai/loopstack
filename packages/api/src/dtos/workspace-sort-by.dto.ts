import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceEntityInterface } from '@loopstack/shared';


export class WorkspaceSortByDto {
  @ApiProperty({ enum: [] })
  field: keyof WorkspaceEntityInterface;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
