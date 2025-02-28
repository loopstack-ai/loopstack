import { SortOrder } from '../enums/sort-order.enum';
import { WorkspaceEntity } from '@loopstack/core/dist/persistence/entities/workspace.entity';
import {getEntityColumns} from "../utils/get-entity-columns.util";
import {ApiProperty} from "@nestjs/swagger";

const sortFields = getEntityColumns(WorkspaceEntity);

export class WorkspaceSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof WorkspaceEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
