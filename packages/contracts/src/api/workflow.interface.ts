import { WorkflowState } from '../enums/workflow-state.enum.js';
import { SortByInterface } from './common.interface.js';

export interface WorkflowItemInterface {
  id: string;
  blockName: string;
  title: string;
  labels: string[];
  status: WorkflowState;
  hasError: boolean;
  place: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  pipelineId: string;
}

export interface WorkflowFilterInterface {
  pipelineId?: string;
}

export type WorkflowSortByInterface = SortByInterface;
