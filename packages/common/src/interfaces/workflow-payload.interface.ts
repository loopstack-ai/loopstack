import type { WorkflowState } from '@loopstack/contracts/enums';

export interface WorkflowPayload<TArgs = unknown> {
  workspaceId: string;
  workflowId?: string;
  args?: TArgs;
  transition?: TransitionPayload;
  /** Optional labels for categorizing/filtering workflow runs (e.g. ['session:abc-123']) */
  labels?: string[];
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
