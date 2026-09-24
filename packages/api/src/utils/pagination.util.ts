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
  maxLimit?: number,
): { skip: number; take: number; page: number; limit: number } {
  const requested = pagination.limit ?? defaultLimit;
  // A client asking for more than the cap gets the cap: one request must never read an unbounded list.
  const limit = maxLimit ? Math.min(requested, maxLimit) : requested;
  const page = pagination.page ?? 0;
  return { skip: page * limit, take: limit, page, limit };
}
