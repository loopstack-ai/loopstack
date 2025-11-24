import { WorkflowState } from '../enums';
import { JSONSchemaConfigType, UiFormType, WorkflowTransitionType } from '../schemas';
import { HistoryTransition } from './history-transition.interface';

export interface WorkflowInterface {
  id: string;
  configKey: string;
  title: string;
  index: number;
  labels: string[];
  progress: number;
  status: WorkflowState;
  hasError: boolean;
  errorMessage: string | null;
  place: string;
  availableTransitions: WorkflowTransitionType[] | null;
  history: HistoryTransition[] | null;
  schema: JSONSchemaConfigType;
  ui: UiFormType | null;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  pipelineId: string;
  namespaceId: string;
}