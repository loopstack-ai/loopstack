import { WorkflowState } from '@loopstack/contracts/enums';
import { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { StatelessChildRecord, WorkflowMetadataInterface } from '../interfaces/workflow-metadata.interface.js';

/**
 * The result-carrying fields of a `StatelessChildRecord`, derived from a processing run's
 * metadata. Used wherever a child record is created or updated from a `process()` result.
 */
export function statelessChildResultFields(
  childMeta: WorkflowMetadataInterface,
): Pick<
  StatelessChildRecord,
  'status' | 'result' | 'documents' | 'statelessState' | 'availableTransitions' | 'hasError' | 'errorMessage'
> {
  return {
    status: childMeta.status,
    result: childMeta.result ?? null,
    documents: childMeta.documents,
    statelessState: childMeta.statelessState,
    availableTransitions: childMeta.availableTransitions ?? [],
    hasError: childMeta.hasError,
    errorMessage: childMeta.errorMessage,
  };
}

/**
 * The callback a settled child owes its parent, as the parent's pending transition: `onSuccess` with the
 * result for a completed child, `onFailure` with the error for a failed or canceled one. A failed child whose
 * parent declared no `onFailure` is delivered to `onSuccess` flagged `unhandledFailure`, which parks the parent
 * as failed at the place it waits at. `null` when there is nothing to call.
 */
export function childCallback(
  child: {
    workflowId: string;
    status: WorkflowState;
    onSuccessTransition: string | null;
    onFailureTransition: string | null;
    callbackMetadata: Record<string, unknown> | null;
    result: Record<string, unknown> | null;
    errorMessage?: string | null;
  },
  parentWorkflowId: string,
): TransitionPayloadInterface | null {
  const meta = child.callbackMetadata ? { meta: child.callbackMetadata } : {};
  if (child.status === WorkflowState.Completed) {
    if (!child.onSuccessTransition) return null;
    return {
      id: child.onSuccessTransition,
      workflowId: parentWorkflowId,
      payload: { workflowId: child.workflowId, status: 'completed', data: child.result ?? null, ...meta },
    };
  }
  if (child.status !== WorkflowState.Failed && child.status !== WorkflowState.Canceled) return null;
  const failure = {
    workflowId: child.workflowId,
    status: child.status,
    errorMessage: child.errorMessage ?? null,
    ...meta,
  };
  if (child.onFailureTransition) {
    return { id: child.onFailureTransition, workflowId: parentWorkflowId, payload: failure };
  }
  if (child.onSuccessTransition) {
    return {
      id: child.onSuccessTransition,
      workflowId: parentWorkflowId,
      payload: { ...failure, unhandledFailure: true },
    };
  }
  return null;
}

/** The callback a stateless child owes its parent — see {@link childCallback}. */
export function statelessChildCallback(
  record: StatelessChildRecord,
  parentWorkflowId: string,
): TransitionPayloadInterface | null {
  return childCallback(record, parentWorkflowId);
}
