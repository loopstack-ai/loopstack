import { ProjectEntity } from '@loopstack/core';
import { SortOrder } from '../enums/sort-order.enum';
import { ApiProperty } from '@nestjs/swagger';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(ProjectEntity);

export class ProjectSortByDto {
  @ApiProperty({ enum: sortFields })
  field: keyof ProjectEntity;

  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
