import { TransitionPayloadInterface } from '@loopstack/shared';
import { ContextImportInterface } from './context-import.interface';
import { NamespaceEntity } from '../../persistence/entities';

export interface ContextInterface {
  userId: string | null;
  projectId: string;
  workspaceId: string;
  model: string;
  projectNamespaceIds: string[];

  transition?: TransitionPayloadInterface;

  labels: string[];
  namespace: NamespaceEntity;

  iteratorGroup?: string;
  iteratorValue?: any;

  customOptions?: Record<string, any>;
  imports?: ContextImportInterface[];
}
