import { DocumentEntity, TransitionMetadataInterface } from '@loopstack/shared';
import { ToolResultLookup, TransitionResultLookup } from '../services';
import { Expose } from 'class-transformer';

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

export class WorkflowStateDto implements BlockStateInterface {
  @Expose()
  id: string;

  @Expose()
  error?: boolean;

  @Expose()
  stop?: boolean;

  @Expose()
  history?: string[];

  @Expose()
  transition?: TransitionMetadataInterface;

  @Expose()
  place?: string;

  @Expose()
  documentIds: string[];

  @Expose()
  toolResults?: ToolResultLookup;

  @Expose()
  transitionResults?: TransitionResultLookup;

  constructor(data: Partial<WorkflowStateDto>) {
    Object.assign(this, data);
  }

  setDocumentIds(documents: DocumentEntity[]) {
    this.documentIds = documents.map((item) => item.id);
  }
}