/**
 * The framework's time source — inject via the `CLOCK` token instead of calling `Date.now()`
 * or `setTimeout` directly, so time-dependent logic stays deterministic under a test clock.
 *
 * @public
 */
export interface Clock {
  /** Current time (epoch ms). */
  now(): number;
  /** Schedule `fn` after `ms`; returns a cancel function. */
  schedule(fn: () => void, ms: number): () => void;
}
