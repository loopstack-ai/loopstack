import { ProjectEntity } from '@loopstack/core/dist/persistence/entities/project.entity';
import { SortOrder } from '../enums/sort-order.enum';

export class ProjectSortByDto {
  field: keyof ProjectEntity;
  order: SortOrder;
}
