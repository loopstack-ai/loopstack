export const LLM_MODULE_CONFIG = Symbol('LLM_MODULE_CONFIG');

/**
 * Config for `LlmProviderModule` — the default `provider` and `model` passed to
 * `forRoot()` / `forFeature()`.
 *
 * @public
 */
export interface LlmModuleConfig {
  provider?: string;
  model?: string;
}
