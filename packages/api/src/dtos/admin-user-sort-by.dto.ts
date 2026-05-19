import { IsEnum, IsIn } from 'class-validator';
import { User } from '@loopstack/common';
import { SortOrder } from '../enums/sort-order.enum.js';
import { getEntityColumns } from '../utils/get-entity-columns.util.js';

const sortFields = getEntityColumns(User);

export class AdminUserSortByDto {
  @IsIn(sortFields)
  field: keyof User;

  @IsEnum(SortOrder)
  order: SortOrder;
}
