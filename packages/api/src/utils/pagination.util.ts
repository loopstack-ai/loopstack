/**
 * Resolves list pagination to concrete query values — the single place that
 * defines the API's pagination convention: `page` is 0-indexed everywhere.
 *
 * Returns the values to feed TypeORM (`skip`/`take`) and the values to report
 * back in the response (`page`/`limit` actually served, not the raw input).
 */
export function resolvePagination(
  pagination: { page?: number | undefined; limit?: number | undefined },
  defaultLimit: number,
): { skip: number; take: number; page: number; limit: number } {
  const limit = pagination.limit ?? defaultLimit;
  const page = pagination.page ?? 0;
  return { skip: page * limit, take: limit, page, limit };
}
