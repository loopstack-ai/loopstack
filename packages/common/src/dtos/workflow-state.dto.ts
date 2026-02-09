import type { HistoryTransition, WorkflowTransitionType } from '@loopstack/contracts/types';
import { DocumentEntity } from '../entities';
import { PersistenceState, ToolResultLookup, TransitionResultLookup } from '../interfaces';
import { WorkflowTransitionDto } from './workflow-transition.dto';

export type InitWorkflowState = Omit<WorkflowStateDto, 'addDocuments' | 'addDocument' | 'updateDocument'>;

export class WorkflowStateDto {
  id!: string;
  error!: boolean;
  stop!: boolean;
  history!: HistoryTransition[];
  transition?: WorkflowTransitionDto;
  place!: string;
  transitionResults?: TransitionResultLookup | null;
  currentTransitionResults?: ToolResultLookup | null;
  availableTransitions?: WorkflowTransitionType[] | null;
  documents!: DocumentEntity[];

  persistenceState: PersistenceState = {
    documentsUpdated: false,
  };

  constructor(data: InitWorkflowState) {
    Object.assign(this, data);
  }

  addDocuments(documents: DocumentEntity[]) {
    for (const document of documents) {
      const existingIndex = document.id ? this.documents.findIndex((d) => d.id === document.id) : -1;

      if (existingIndex != -1) {
        this.updateDocument(existingIndex, document);
      } else {
        this.addDocument(document);
      }
    }
  }

  updateDocument(index: number, document: DocumentEntity) {
    if (index != -1) {
      this.documents[index] = document;
    }

    this.persistenceState.documentsUpdated = true;
  }

  addDocument(document: DocumentEntity) {
    // invalidate previous versions of the same document
    for (const doc of this.documents) {
      if (doc.messageId === document.messageId && doc.meta?.invalidate !== false) {
        doc.isInvalidated = true;
      }
    }

    this.documents.push(document);

    this.persistenceState.documentsUpdated = true;
  }
}
