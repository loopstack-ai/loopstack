import { WorkflowState } from '../../enums';
import { JSONSchemaConfigType } from '../types/json-schema-config.type';
import { UiFormType } from '../types/ui-form.type';
import { WorkflowTransitionType } from '../types/workflow-transition.type';
import { HistoryTransition } from './history-transition.interface';

export interface WorkflowInterface {
  id: string;
  blockName: string;
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
