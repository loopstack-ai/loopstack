import { z } from 'zod';

/**
 * Builds the schema for a paginated list response of the given item schema.
 */
export function createPaginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  });
}

export interface PaginatedInterface<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
