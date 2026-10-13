import { z } from 'zod';

/**
 * A column filter that matches one value or any of several — `status: 'waiting'` and
 * `status: ['waiting', 'running']` are both valid, the latter reading as SQL `IN`.
 */
export function oneOrMany<T extends z.ZodType>(value: T) {
  return z.union([value, z.array(value).min(1)]);
}
