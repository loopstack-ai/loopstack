/**
 * Config token + types for {@link ClaimsModule}. A leaf file (no service or module imports) so the service
 * can inject the token without a circular dependency on the module.
 */

/**
 * A resource whose capacity differs from the default.
 *
 * @public
 */
export interface ResourceDefinition {
  /** The resource key, exactly as claimers name it. */
  key: string;
  /**
   * How many **shared** holders the resource admits. `null` is unlimited. Omitted is {@link DEFAULT_CAPACITY}.
   * An exclusive claim admits no other holder whatever the capacity.
   */
  capacity?: number | null;
}

/**
 * Configuration for `ClaimsModule.forRoot`.
 *
 * @public
 */
export interface ClaimsModuleConfig {
  /**
   * Capacities for the resources that have one. A key that is not listed has {@link DEFAULT_CAPACITY},
   * which is what lets a key be invented on demand — `pkg:@loopstack/core`, `area:234` — and still be
   * claimable exactly once.
   *
   * Capacity is configured and never passed with a claim: two callers disagreeing about the size of a pool
   * would be a bug with no right answer.
   */
  resources?: ResourceDefinition[];
}

/** DI token for the resolved {@link ClaimsModuleConfig}. */
export const CLAIMS_MODULE_CONFIG = Symbol('CLAIMS_MODULE_CONFIG');

/**
 * The capacity of a resource nothing configured: one holder.
 *
 * @public
 */
export const DEFAULT_CAPACITY = 1;
