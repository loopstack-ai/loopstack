import { IsEnum, IsIn } from 'class-validator';
import { DocumentEntity } from '@loopstack/common';
import { SortOrder } from '../enums/sort-order.enum';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(DocumentEntity);

export class DocumentSortByDto {
  @IsIn(sortFields)
  field: keyof DocumentEntity;

  @IsEnum(SortOrder)
  order: SortOrder;
}
