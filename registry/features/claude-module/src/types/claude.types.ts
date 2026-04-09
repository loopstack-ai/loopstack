import Anthropic from '@anthropic-ai/sdk';
import type { ToolCallsMap } from '@loopstack/common';

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

/**
 * Result data from ClaudeGenerateText tool.
 * Extends the Anthropic Message with optional tool call metadata.
 */
export interface ClaudeGenerateTextResult extends Anthropic.Message {
  toolCalls?: ToolCallsMap;
}

/**
 * Result data from DelegateToolCalls tool.
 */
export interface DelegateToolCallsResult {
  allCompleted: boolean;
  toolResults: DelegateToolResultEntry[];
  message: { id?: string; content: Anthropic.ContentBlock[] };
  pendingCount: number;
}

export interface DelegateToolResultEntry {
  type: 'tool_result';
  tool_use_id: string;
  content?: string;
  is_error?: boolean;
}

// Re-export Anthropic namespace for consumer convenience
export { default as Anthropic } from '@anthropic-ai/sdk';
