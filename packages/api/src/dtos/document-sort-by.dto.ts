import { SortOrder } from '../enums/sort-order.enum';
import {ApiProperty} from "@nestjs/swagger";
import {getEntityColumns} from "../utils/get-entity-columns.util";
import {DocumentEntity} from "@loopstack/core";

const sortFields = getEntityColumns(DocumentEntity);

export class DocumentSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof DocumentEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
