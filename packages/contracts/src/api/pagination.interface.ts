export interface PaginatedInterface<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
