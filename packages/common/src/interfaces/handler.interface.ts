import { DocumentEntity } from '../entities';

export interface ToolSideEffects {
  setTransitionPlace?: string;
  addWorkflowDocuments?: DocumentEntity[];
}

export type HandlerCallResult = {
  type?: 'text' | 'image' | 'file';
  data?: any;
  error?: string;
  effects?: ToolSideEffects
};
