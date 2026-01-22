import { Expose } from 'class-transformer';
import { DocumentEntity, ToolResultLookup, TransitionResultLookup } from '@loopstack/common';
import type { HistoryTransition, WorkflowTransitionType } from '@loopstack/contracts/types';
import { PersistenceState } from '../interfaces';
import { WorkflowTransitionDto } from './workflow-transition.dto';

interface BlockStateInterface {
  id: string;
  error?: boolean;
  stop?: boolean;
}

export class BlockStateDto implements BlockStateInterface {
  @Expose()
  id: string;

  @Expose()
  error?: boolean;

  @Expose()
  stop?: boolean;

  constructor(data: Partial<BlockStateDto>) {
    Object.assign(this, data);
  }
}

export type InitWorkflowState = Omit<WorkflowStateDto, 'addDocuments' | 'addDocument' | 'updateDocument'>;

export class WorkflowStateDto implements BlockStateInterface {
  @Expose()
  id: string;

  @Expose()
  error: boolean;

  @Expose()
  stop: boolean;

  @Expose()
  history: HistoryTransition[];

  @Expose()
  transition?: WorkflowTransitionDto;

  @Expose()
  place: string;

  @Expose()
  transitionResults: TransitionResultLookup | null;

  @Expose()
  currentTransitionResults: ToolResultLookup | null;

  @Expose()
  availableTransitions: WorkflowTransitionType[] | null;

  documents: DocumentEntity[];

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
