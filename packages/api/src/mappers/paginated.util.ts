import { PaginatedInterface } from '@loopstack/contracts/api';

export function toPaginated<TSource, TItem>(
  result: { data: TSource[]; total: number; page: number; limit: number },
  mapItem: (source: TSource) => TItem,
): PaginatedInterface<TItem> {
  return {
    data: result.data.map(mapItem),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
}
