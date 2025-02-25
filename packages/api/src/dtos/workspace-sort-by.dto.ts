import { SortOrder } from '../enums/sort-order.enum';
import { WorkspaceEntity } from '@loopstack/core/dist/persistence/entities/workspace.entity';

export class WorkspaceSortByDto {
  field: keyof WorkspaceEntity;
  order: SortOrder;
}
