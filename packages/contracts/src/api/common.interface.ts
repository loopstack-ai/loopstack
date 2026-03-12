import { SortOrder } from '../enums/sort-order.enum.js';

export interface SortByInterface {
  field: string;
  order: SortOrder;
}
