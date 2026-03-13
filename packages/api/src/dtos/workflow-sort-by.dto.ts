import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import { WorkflowEntity } from '@loopstack/common';
import { SortOrder } from '@loopstack/contracts/enums';
import { getEntityColumns } from '../utils/get-entity-columns.util';

const sortFields = getEntityColumns(WorkflowEntity);

export class WorkflowSortByDto {
  @IsIn(sortFields)
  @ApiProperty({ enum: sortFields })
  field: keyof WorkflowEntity;

  @IsEnum(SortOrder)
  @ApiProperty({ enum: SortOrder })
  order: SortOrder;
}
