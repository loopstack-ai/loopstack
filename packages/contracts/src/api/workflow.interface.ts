import { WorkflowState } from '../enums/workflow-state.enum.js';
import { SortByInterface } from './common.interface.js';

export interface WorkflowContextInterface {
  [key: string]: any;
}

export interface WorkflowItemInterface {
  id: string;
  blockName: string;
  className: string | null;
  title: string;
  run: number;
  labels: string[];
  order: number;
  status: WorkflowState;
  hasError: boolean;
  place: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  parentId: string | null;
  hasChildren: number;
}

export interface WorkflowFullInterface extends WorkflowItemInterface {
  errorMessage: string | null;
  context: WorkflowContextInterface;
  schema: any;
  ui: any;
  result: Record<string, unknown> | null;
  availableTransitions: any[] | null;
  args: any;
  eventCorrelationId: string | null;
}

export interface WorkflowCreateInterface {
  blockName: string;
  title: string | null;
  labels?: string[];
  workspaceId: string;
  transition: string | null;
  args: any;
  context?: Record<string, any>;
}

export interface WorkflowUpdateInterface {
  title?: string;
  labels?: string[];
}

export interface WorkflowSourceInterface {
  name: string;
  filePath: string | null;
  raw: string | null;
}

export interface WorkflowFilterInterface {
  workspaceId?: string;
  parentId?: string | null;
  status?: string;
}

export type WorkflowSortByInterface = SortByInterface;

export interface RunWorkflowPayloadInterface {
  transition?: any;
}
