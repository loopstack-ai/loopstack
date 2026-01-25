import { DocumentEntity } from '@loopstack/common';
import { HistoryTransition } from '@loopstack/contracts/types';

export interface WorkflowMetadataInterface {
  documents: DocumentEntity[];
  place: string;
  tools: Record<string, any>;
  transition?: HistoryTransition;
}
