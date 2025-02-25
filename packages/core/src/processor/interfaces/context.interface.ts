import { NamespacesType } from './namespaces-type';
import { TransitionPayloadInterface } from '../../state-machine/interfaces/transition-payload.interface';

export interface ContextInterface {
  userId: string | null;
  projectId: string;
  workspaceId: string;
  projectNamespaces: NamespacesType;

  transitions: TransitionPayloadInterface[];

  labels: string[];
  namespaces: NamespacesType;

  iterator?: { key: string; value: string };
}
