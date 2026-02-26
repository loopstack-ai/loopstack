/**
 * Returns a required route param or throws. Use when the route guarantees the param exists.
 * For optional params, use useParams() directly.
 */
export function requireParam(params: Record<string, string | undefined>, key: string): string {
  const value = params[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required route param: ${key}`);
  }
  return value;
}
