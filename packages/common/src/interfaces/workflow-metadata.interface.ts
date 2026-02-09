import { WorkflowState } from '@loopstack/contracts/enums';
import { WorkflowTransitionType } from '@loopstack/contracts/types';
import { HistoryTransition } from '@loopstack/contracts/types';
import { DocumentEntity } from '../entities';

export interface WorkflowMetadataInterface {
  error: boolean;
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

  result?: Record<string, unknown>;
}
