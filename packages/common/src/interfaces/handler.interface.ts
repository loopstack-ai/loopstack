import { DocumentEntity } from '../entities';

export interface ToolSideEffects {
  addWorkflowDocuments?: DocumentEntity[];
}

export type ToolResult<TData = any> = {
  type?: 'text' | 'image' | 'file';
  data?: TData;
  error?: string;
  effects?: ToolSideEffects[];
  metadata?: Record<string, unknown>;
};

export interface ToolCallEntry {
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
}

export type ToolCallsMap = Record<string, ToolCallEntry>;
