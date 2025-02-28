import { TransitionPayloadInterface } from '../../state-machine/interfaces/transition-payload.interface';
import {ContextImportInterface} from "./context-import.interface";
import {NamespacesType} from "@loopstack/shared";

export interface ContextInterface {
  userId: string | null;
  projectId: string;
  workspaceId: string;
  projectNamespaces: NamespacesType;

  transition?: TransitionPayloadInterface;

  labels: string[];
  namespaces: NamespacesType;

  iterator?: { key: string; value: string };
  customOptions?: Record<string, any>;
  imports?: ContextImportInterface[];
}
