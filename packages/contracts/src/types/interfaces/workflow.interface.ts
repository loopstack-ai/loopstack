import { WorkflowState } from '../../enums';
import { HistoryTransition } from './history-transition.interface';
import { JSONSchemaConfigType } from '../types/json-schema-config.type';
import { UiFormType } from '../types/ui-form.type';
import { WorkflowTransitionType } from '../types/workflow-transition.type';

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