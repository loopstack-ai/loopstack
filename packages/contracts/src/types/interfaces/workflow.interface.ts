import { WorkflowState } from '../../enums';
import { WorkflowTransitionType } from '../types/workflow-transition.type';

export interface WorkflowInterface {
  id: string;
  blockName: string;
  title: string;
  labels: string[];
  status: WorkflowState;
  hasError: boolean;
  errorMessage: string | null;
  place: string;
  availableTransitions: WorkflowTransitionType[] | null;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  pipelineId: string;
}
