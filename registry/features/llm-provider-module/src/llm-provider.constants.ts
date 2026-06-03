export const LLM_MODULE_CONFIG = Symbol('LLM_MODULE_CONFIG');

export interface LlmModuleConfig {
  provider?: string;
  model?: string;
}
