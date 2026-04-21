import { WorkflowState } from '@loopstack/contracts/enums';
import { WorkflowTransitionType } from '@loopstack/contracts/types';
import { HistoryTransition } from '@loopstack/contracts/types';
import { DocumentEntity } from '../entities';

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

  result: Record<string, unknown> | null;

  /** Current retry attempt count for the active transition (0 = first try). */
  retryCount: number;
  /** Method name of the transition being retried — used to detect new vs repeated failures. */
  retryTransitionId?: string;
  /** Transient signal for the caller to re-queue the workflow with a delay. Not persisted. */
  _retrySignal?: { delayMs: number };
}
