import { WorkflowState } from '../../enums/index.js';
import { WorkflowTransitionType } from '../types/workflow-transition.type.js';

export interface WorkflowInterface {
  id: string;
  workflowName: string;
  title: string;
  run: number;
  labels: string[];
  status: WorkflowState;
  hasError: boolean;
  errorMessage: string | null;
  place: string;
  availableTransitions: WorkflowTransitionType[] | null;
  args: any;
  context: Record<string, any>;
  callbackTransition: string | null;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  parentId: string | null;
}
