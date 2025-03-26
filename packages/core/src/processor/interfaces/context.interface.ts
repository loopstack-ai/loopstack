import { TransitionPayloadInterface } from '@loopstack/shared';
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
}