import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import { User } from '@loopstack/common';
import { SortOrder } from '../enums/sort-order.enum';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(User);

export class AdminUserSortByDto {
  @IsIn(sortFields)
  @ApiProperty({ enum: sortFields })
  field: keyof User;

  @IsEnum(SortOrder)
  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
