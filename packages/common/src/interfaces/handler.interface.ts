import { DocumentEntity } from '../entities';

export interface ToolSideEffects {
  addWorkflowDocuments?: DocumentEntity[];
}

export type ToolResult<TData = any> = {
  type?: 'text' | 'image' | 'file';
  data?: TData;
  error?: string;
  effects?: ToolSideEffects;
};
