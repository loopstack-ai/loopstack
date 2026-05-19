import type {
  LlmGenerateObjectArgs,
  LlmGenerateObjectResult,
  LlmGenerateTextArgs,
  LlmGenerateTextResult,
  LlmNormalizedMessage,
  LlmUsage,
} from '../types/index.js';
import type { LlmContext } from './llm-context.js';

/**
 * Contract for LLM provider implementations.
 *
 * Each provider module (Claude, OpenAI, etc.) implements this interface as a plain
 * NestJS @Injectable() service and registers itself with the LlmProviderRegistry
 * at module init via OnModuleInit.
 *
 * Tool delegation (delegateToolCalls, updateToolResult) is handled by
 * LlmDelegateService — it's provider-agnostic framework logic.
 */
export interface LlmProviderInterface<TProviderConfig = Record<string, unknown>> {
  /** Unique provider identifier (e.g. 'claude', 'openai'). Used in workflow args. */
  readonly providerId: string;

  /** Invoke the LLM and return a normalized response. */
  generateText(args: LlmGenerateTextArgs<TProviderConfig>, ctx: LlmContext): Promise<LlmGenerateTextResult>;

  /** Generate a structured object conforming to a JSON Schema. */
  generateObject(args: LlmGenerateObjectArgs<TProviderConfig>, ctx: LlmContext): Promise<LlmGenerateObjectResult>;

  /** Extract usage stats from the native API response. */
  extractUsage(response: unknown): LlmUsage | undefined;

  /** Convert normalized content to provider-specific message format (for resolveMessages fallback). */
  toProviderMessage(content: LlmNormalizedMessage): unknown;
}
