import { WorkflowEntity } from '../../persistence/entities';
import { DocumentCreateInterface } from '../../persistence/interfaces/document-create.interface';

export interface TransitionResultInterface {
  workflow: WorkflowEntity;
  nextPlace: string | undefined;
  documents: DocumentCreateInterface[];
}
