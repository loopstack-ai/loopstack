/**
 * Config token + type for {@link SecretsModule}. Kept in a leaf file (no service/module imports) so
 * `SecretService` can inject the token without a circular dependency on the module.
 */

/**
 * Configuration for `SecretsModule.forRoot` / `SecretsModule.forFeature`.
 *
 * @public
 */
export interface SecretsModuleConfig {
  /** Toggles the `secrets` Studio feature on/off (defaults to true). */
  enabled?: boolean;
  /**
   * Secret keys allowed to fall back to a value from `process.env` when the current workspace has no
   * secret of that key. Values come from the environment; only these key names are eligible. A workspace
   * secret of the same key always wins. Scoped to the module this config is registered on — different
   * modules can declare different allowlists.
   */
  globalSecretKeys?: string[];
}

/** DI token for the resolved {@link SecretsModuleConfig}. */
export const SECRETS_MODULE_CONFIG = Symbol('SECRETS_MODULE_CONFIG');
