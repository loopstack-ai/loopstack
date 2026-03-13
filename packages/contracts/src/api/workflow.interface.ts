import { WorkflowState } from '../enums/workflow-state.enum.js';
import { SortByInterface } from './common.interface.js';

export interface WorkflowItemInterface {
  id: string;
  blockName: string;
  title: string;
  index: number;
  labels: string[];
  progress: number;
  status: WorkflowState;
  hasError: boolean;
  place: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  pipelineId: string;
  namespaceId: string;
}

export interface WorkflowFilterInterface {
  namespaceId?: string;
  pipelineId?: string;
}

export type WorkflowSortByInterface = SortByInterface;
