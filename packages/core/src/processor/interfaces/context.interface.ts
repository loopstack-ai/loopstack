import { NamespacesType } from './namespaces-type';
import { TransitionPayloadInterface } from '../../state-machine/interfaces/transition-payload.interface';

export interface ContextInterface {
  userId: string;
  projectId: string;
  workspaceId: string;
  projectNamespaces: NamespacesType;

  labels: string[];
  namespaces: NamespacesType;
  transitions: TransitionPayloadInterface[];

  iterator?: { key: string; value: string };
}
