import { WorkflowState } from '@loopstack/contracts/enums';
import { WorkflowTransitionType } from '@loopstack/contracts/types';
import { HistoryTransition, TransitionPayloadInterface } from '@loopstack/contracts/types';
import { DocumentEntity } from '../entities/index.js';

/**
 * In-memory execution state of a stateless run. Returned on the metadata when a stateless run
 * parks (wait transition); pass it back via `InternalRunContext.statelessState` together with a
 * `payload.transition` to resume the run in-process — no persistence involved.
 */
export interface StatelessExecutionState {
  place: string;
  state: Record<string, unknown>;
  documents: DocumentEntity[];
  /** Sub-workflow callback envelopes not yet applied to the parent. */
  callbacks?: TransitionPayloadInterface[];
  /** Inline-executed sub-workflow runs of this run (terminal and parked). */
  children?: StatelessChildRecord[];
}

/**
 * An inline-executed sub-workflow of a stateless run. Terminal children carry their result;
 * parked children carry their own `statelessState` and the transitions they are waiting on, so
 * the caller can answer their wait transition and deliver the callback to the parent.
 */
export interface StatelessChildRecord {
  workflowId: string;
  workflowName: string;
  status: WorkflowState;
  args?: Record<string, unknown>;
  callbackTransition: string | null;
  callbackMetadata: Record<string, unknown> | null;
  documents: DocumentEntity[];
  result: Record<string, unknown> | null;
  hasError: boolean;
  errorMessage?: string;
  statelessState?: StatelessExecutionState;
  /** The transitions the child is waiting on while parked (empty when terminal). */
  availableTransitions: WorkflowTransitionType[];
}

export interface WorkflowMetadataInterface {
  hasError: boolean;
  errorMessage?: string;
  stop: boolean;
  status: WorkflowState;
  availableTransitions: WorkflowTransitionType[];
  persistenceState: {
    documentsUpdated: boolean;
  };
  nextPlace?: string;

  documents: DocumentEntity[];
  place: string;
  tools: Record<string, any>;
  transition?: HistoryTransition;
  /** Ordered record of the transitions executed during this processing run. */
  history: HistoryTransition[];

  result: Record<string, unknown> | null;

  /** Current retry attempt count for the active transition (0 = first try). */
  retryCount: number;
  /** Method name of the transition being retried — used to detect new vs repeated failures. */
  retryTransitionId?: string;
  /** Transient signal for the caller to re-queue the workflow with a delay. Not persisted. */
  _retrySignal?: { delayMs: number };
  /** Stateless runs only: the in-memory state carrier to resume a parked run. */
  statelessState?: StatelessExecutionState;
}
