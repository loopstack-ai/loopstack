import type { WorkflowState } from '@loopstack/contracts/enums';

export interface WorkflowPayload<TArgs = unknown> {
  workspaceId: string;
  workflowId?: string;
  args?: TArgs;
  transition?: TransitionPayload;
}

export interface TransitionPayload {
  id: string;
  payload?: Record<string, unknown>;
}

export interface WorkflowRunResult {
  workflowId: string;
  workspaceId: string;
  status: WorkflowState;
}
