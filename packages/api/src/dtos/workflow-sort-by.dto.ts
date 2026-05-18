import { IsEnum, IsIn } from 'class-validator';
import { WorkflowEntity } from '@loopstack/common';
import { SortOrder } from '@loopstack/contracts/enums';
import { getEntityColumns } from '../utils/get-entity-columns.util.js';

const sortFields = getEntityColumns(WorkflowEntity);

export class WorkflowSortByDto {
  @IsIn(sortFields)
  field: keyof WorkflowEntity;

  @IsEnum(SortOrder)
  order: SortOrder;
}
