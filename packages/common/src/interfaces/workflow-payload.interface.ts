export interface WorkflowPayload<TArgs = unknown> {
  workspaceId: string;
  workflowId?: string;
  args?: TArgs;
  transition?: TransitionRequest;
  /** Optional labels for categorizing/filtering workflow runs (e.g. ['session:abc-123']) */
  labels?: string[];
  /** Persist this run's trace events (rows in `core_run_trace_event`), including sub-workflows. */
  trace?: boolean;
}

/** A caller's request to fire a waiting transition; the runner adds the workflow id when it queues it. */
export interface TransitionRequest {
  id: string;
  payload?: Record<string, unknown>;
}

/**
 * Result of `WorkflowRunner.execute` — the controller-facing entry point that
 * starts, resumes, or retries a workflow based on the payload shape. Defined
 * in `@loopstack/contracts/api` — the same schema types the REST response.
 *
 * @public
 */
export type { WorkflowRunResult } from '@loopstack/contracts/api';
