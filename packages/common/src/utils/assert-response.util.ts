import { z } from 'zod';

/**
 * Validates a mapped response object against its contract schema outside
 * production, so contract drift fails loudly in dev and tests.
 */
export function assertResponse<T>(schema: z.ZodType<T>, value: T): T {
  if (process.env.NODE_ENV !== 'production') {
    schema.parse(value);
  }
  return value;
}
