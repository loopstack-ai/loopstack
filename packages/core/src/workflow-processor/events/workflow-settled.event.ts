import { WorkflowState } from '@loopstack/contracts/enums';

/**
 * In-process event name for {@link WorkflowSettledEvent}.
 *
 * @public
 */
export const WORKFLOW_SETTLED = 'workflow.settled';

/** The states a run can settle in — the ones it never leaves on its own. */
export type SettledWorkflowState = WorkflowState.Completed | WorkflowState.Failed | WorkflowState.Canceled;

/**
 * Emitted once a run has reached a state it will not leave by itself: completed, failed, or canceled. The
 * counterpart of `workspace.deleted` / `workflow.deleted`, for the end of a run rather than the end of its
 * record — so a host application can release what it was holding for that run (a claimed resource, a
 * reserved slot) without polling for it.
 *
 * Emitted after the run's own persistence has committed, and for sub-workflows as well as root runs — a
 * consumer that only cares about root runs checks `parentId`.
 *
 * A consumer must be **idempotent**: there is no guarantee the event arrives exactly once per run, and a
 * process that dies before its listener ran will never see it at all. Anything whose correctness depends on
 * it should reconcile against the run's status instead, and treat the event as what makes that prompt.
 *
 * @public
 */
export interface WorkflowSettledEvent {
  /** The run that settled. */
  id: string;
  workspaceId: string;
  workflowName: string;
  /** The parent run, when this was a sub-workflow. */
  parentId?: string;
  status: SettledWorkflowState;
  /** The user the run belongs to — what a listener queues follow-up work as. */
  user: string;
}

/** Whether a status is one a run does not leave on its own. */
export function isSettledState(status: WorkflowState): status is SettledWorkflowState {
  return status === WorkflowState.Completed || status === WorkflowState.Failed || status === WorkflowState.Canceled;
}
