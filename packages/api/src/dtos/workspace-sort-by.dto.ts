import { IsEnum, IsIn } from 'class-validator';
import { WorkspaceEntity } from '@loopstack/common';
import { SortOrder } from '@loopstack/contracts/enums';
import { getEntityColumns } from '../utils/get-entity-columns.util.js';

const sortFields = getEntityColumns(WorkspaceEntity);

export class WorkspaceSortByDto {
  @IsIn(sortFields)
  field: keyof WorkspaceEntity;

  @IsEnum(SortOrder)
  order: SortOrder;
}
