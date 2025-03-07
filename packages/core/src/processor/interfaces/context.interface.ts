import { TransitionPayloadInterface } from '@loopstack/shared';
import { ContextImportInterface } from './context-import.interface';
import { NamespaceEntity } from '../../persistence/entities';

export interface ContextInterface {
  userId: string | null;
  projectId: string;
  workspaceId: string;
  model: string;

  transition?: TransitionPayloadInterface;

  labels: string[];
  namespace: NamespaceEntity;

  customOptions?: Record<string, any>;
  imports?: ContextImportInterface[];

  stopSignal?: boolean;
}
