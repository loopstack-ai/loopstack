import { WorkflowState } from '../../enums';
import { WorkflowTransitionType } from '../types/workflow-transition.type';

export interface WorkflowInterface {
  id: string;
  blockName: string;
  className: string | null;
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
  eventCorrelationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  parentId: string | null;
}
