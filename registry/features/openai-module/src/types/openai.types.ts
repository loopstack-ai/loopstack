export interface OpenAiModelConfig {
  /** Model name (e.g. 'gpt-4o', 'gpt-4o-mini'). Falls back to OPENAI_MODEL env var. */
  model?: string;
  /** Environment variable name containing the API key. Falls back to OPENAI_API_KEY. */
  envApiKey?: string;
}

/**
 * Provider-specific configuration for the OpenAI LLM provider.
 * Passed via `providerConfig` in LlmGenerateTextArgs / LlmGenerateObjectArgs.
 */
export interface OpenAiProviderConfig {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  envApiKey?: string;
}
