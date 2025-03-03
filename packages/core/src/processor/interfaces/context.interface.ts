import { TransitionPayloadInterface } from '../../state-machine/interfaces/transition-payload.interface';
import {ContextImportInterface} from "./context-import.interface";
import {NamespacesType} from "@loopstack/shared";
import {NamespaceEntity} from "../../persistence/entities/namespace.entity";

export interface ContextInterface {
  userId: string | null;
  projectId: string;
  workspaceId: string;
  model: string;
  projectNamespaces: NamespacesType;

  transition?: TransitionPayloadInterface;

  labels: string[];
  namespaces: NamespaceEntity[];

  iteratorGroup?: string;
  iteratorValue?: string;

  customOptions?: Record<string, any>;
  imports?: ContextImportInterface[];
}
