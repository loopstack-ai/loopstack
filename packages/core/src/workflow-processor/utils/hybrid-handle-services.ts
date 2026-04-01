import {
  DocumentEntity,
  DocumentInterface,
  RunContext,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
} from '@loopstack/common';

/**
 * Services needed by hybrid-mode handle proxies (ToolHandle, DocumentHandle, WorkflowHandle).
 * Injected from the NestJS module and threaded to the block proxy at runtime.
 */
export interface HybridHandleServices {
  executeToolCall: (
    tool: ToolInterface,
    args: Record<string, unknown> | undefined,
    runContext: RunContext,
    instance: WorkflowInterface,
    metadata: any,
  ) => Promise<ToolResult>;

  addDocuments: (documents: DocumentEntity[]) => void;

  createDocument: (
    documentInstance: DocumentInterface,
    options: { id?: string; content: unknown; meta?: Record<string, unknown> },
    runContext: RunContext,
    metadata: any,
  ) => Promise<DocumentEntity>;

  executeTask: (
    workflowName: string,
    args: Record<string, unknown>,
    callback: { transition: string } | undefined,
    runContext: RunContext,
    parentInstance: WorkflowInterface,
  ) => Promise<ToolResult>;
}
