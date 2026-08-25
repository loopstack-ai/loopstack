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
 * The callback envelope a stateless child owes its parent — `null` unless the child reached a
 * terminal state and has a callback transition. `parentWorkflowId` is the envelope's target
 * (empty in stateless test runs).
 */
export function statelessChildCallback(
  record: StatelessChildRecord,
  parentWorkflowId: string,
): TransitionPayloadInterface | null {
  const terminal =
    record.status === WorkflowState.Completed ||
    record.status === WorkflowState.Failed ||
    record.status === WorkflowState.Canceled;

  if (!terminal || !record.callbackTransition) return null;

  return {
    id: record.callbackTransition,
    workflowId: parentWorkflowId,
    payload: {
      workflowId: record.workflowId,
      status: record.status,
      hasError: record.hasError ?? false,
      errorMessage: record.errorMessage ?? null,
      data: record.result ?? null,
      ...(record.callbackMetadata ? { meta: record.callbackMetadata } : {}),
    },
  };
}
