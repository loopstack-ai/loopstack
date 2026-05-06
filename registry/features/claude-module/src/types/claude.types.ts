import Anthropic from '@anthropic-ai/sdk';

/**
 * Provider-specific configuration for the Claude LLM provider.
 * Passed via `providerConfig` in LlmGenerateTextArgs / LlmGenerateObjectArgs.
 */
export interface ClaudeProviderConfig {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  cache?: boolean;
  envApiKey?: string;
}

/**
 * Options for a Claude messages API call.
 */
export interface ClaudeGenerateOptions {
  messages: Anthropic.MessageParam[];
  system?: string;
  tools?: Anthropic.Tool[];
  maxTokens?: number;
  toolChoice?: Anthropic.MessageCreateParams['tool_choice'];
}

/**
 * A tool definition in Anthropic's native format.
 */
export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: Anthropic.Tool['input_schema'];
}

// Re-export Anthropic namespace for consumer convenience
export { default as Anthropic } from '@anthropic-ai/sdk';
