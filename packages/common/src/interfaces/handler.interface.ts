import { DocumentEntity } from '../entities';

export interface ToolSideEffects {
  setTransitionPlace?: string;
  addWorkflowDocuments?: DocumentEntity[];
}

export type ToolResult<TData = any> = {
  type?: 'text' | 'image' | 'file';
  data?: TData;
  error?: string;
  effects?: ToolSideEffects
};
