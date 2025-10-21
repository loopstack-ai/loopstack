import {
  DocumentEntity,
  HistoryTransition, ToolResultLookup, TransitionResultLookup,
  WorkflowTransitionType,
} from '@loopstack/shared';
import { Expose } from 'class-transformer';
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

export type InitWorkflowState = Omit<WorkflowStateDto, 'addDocuments'>;

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

  constructor(data: InitWorkflowState) {
    Object.assign(this, data);
  }

  addDocuments(documents: DocumentEntity[]) {
    for (const document of documents) {
      const existingIndex = document.id ? this.documents.findIndex((d) => d.id === document.id) : -1;
      if (existingIndex != -1) {
        this.documents[existingIndex] = document;
      } else {
        this.documents.push(document);
      }
    }
  }
}