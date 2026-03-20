import Anthropic from '@anthropic-ai/sdk';

/**
 * Configuration for creating a Claude client and selecting a model.
 */
export interface ClaudeModelConfig {
  /** Model name (e.g. 'claude-sonnet-4-20250514'). Falls back to CLAUDE_MODEL env var. */
  model?: string;
  /** Environment variable name containing the API key. Falls back to ANTHROPIC_API_KEY. */
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
