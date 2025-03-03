import { TransitionPayloadInterface } from '@loopstack/shared';
import { ContextImportInterface } from './context-import.interface';
import { NamespaceEntity } from '../../persistence/entities/namespace.entity';

export interface ContextInterface {
  userId: string | null;
  projectId: string;
  workspaceId: string;
  model: string;
  projectNamespaces: NamespaceEntity[];

  transition?: TransitionPayloadInterface;

  labels: string[];
  namespaces: NamespaceEntity[];

  iteratorGroup?: string;
  iteratorValue?: string;

  customOptions?: Record<string, any>;
  imports?: ContextImportInterface[];
}
