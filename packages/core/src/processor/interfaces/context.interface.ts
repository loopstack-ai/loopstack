import { TransitionPayloadInterface } from '@loopstack/shared';
import { ContextImportInterface } from './context-import.interface';
import { NamespaceEntity } from '../../persistence/entities';

export interface ContextInterface {
  // set once, never change
  userId: string | null;
  projectId: string;
  workspaceId: string;
  model: string;
  transition?: TransitionPayloadInterface;

  // not carried over to siblings and parents
  index: string;
  labels: string[];
  namespace: NamespaceEntity;

  // global, always carried over or set globally
  stopSignal?: boolean;

  // only local
  // customOptions?: Record<string, any>;
  // imports?: ContextImportInterface[];
}