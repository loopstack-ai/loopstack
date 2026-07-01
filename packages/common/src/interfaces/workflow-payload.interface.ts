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

/**
 * Result of `WorkflowRunner.execute` — the controller-facing entry point that
 * starts, resumes, or retries a workflow based on the payload shape.
 *
 * @public
 */
export interface WorkflowRunResult {
  workflowId: string;
  workspaceId: string;
  status: WorkflowState;
}
