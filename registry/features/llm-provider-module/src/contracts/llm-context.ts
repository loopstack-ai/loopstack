import type { DocumentEntity } from '@loopstack/common';

/**
 * Execution context passed to LLM provider methods.
 *
 * Contains the documents for the current workflow execution (used for message history).
 * Tool resolution is handled via ToolRegistry (string name → BaseTool instance).
 */
export interface LlmContext {
  /** Runtime documents for the current workflow execution (used for message history). */
  documents: DocumentEntity[];
}
