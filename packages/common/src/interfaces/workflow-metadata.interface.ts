import { HistoryTransition } from '@loopstack/contracts/types';
import { DocumentEntity } from '../entities';

export interface WorkflowMetadataInterface {
  documents: DocumentEntity[];
  place: string;
  tools: Record<string, any>;
  transition?: HistoryTransition;
}
