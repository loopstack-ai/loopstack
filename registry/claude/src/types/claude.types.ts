/**
 * Provider-specific configuration for the Claude LLM provider.
 * Passed via `providerConfig` in LlmGenerateTextArgs / LlmGenerateObjectArgs.
 *
 * @public
 */
export interface ClaudeProviderConfig {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  /**
   * Enable Anthropic prompt caching. Places cache breakpoints on the system
   * prompt, tool definitions, and the last message automatically — useful for
   * multi-turn workflows where the prefix is reused across calls.
   */
  cache?: boolean;
  envApiKey?: string;
}

// Re-export Anthropic namespace for consumer convenience
export { default as Anthropic } from '@anthropic-ai/sdk';
