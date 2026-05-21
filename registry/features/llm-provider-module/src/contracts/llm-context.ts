import type { DocumentEntity, WorkflowInterface } from '@loopstack/common';

/**
 * Execution context passed to LLM provider methods.
 *
 * Carries the framework context that the provider needs but cannot get through DI
 * (since it is a plain NestJS service, not a @Tool with proxied this.ctx).
 *
 * The workflow constructs this from its own context and passes it to the provider.
 */
export interface LlmContext {
  /** Runtime documents for the current workflow execution (used for message history). */
  documents: DocumentEntity[];
  /** The workflow instance (used for tool resolution via getBlockTool). */
  workflow: WorkflowInterface;
  /** The workspace instance (fallback for tool resolution). */
  workspace?: object;
}
