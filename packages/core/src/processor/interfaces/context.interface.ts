import { TransitionPayloadInterface } from '@loopstack/shared';
import { ContextImportInterface } from './context-import.interface';

export interface ContextInterface {
  userId: string | null;
  projectId: string;
  workspaceId: string;
  model: string;
  projectNamespaceIds: string[];

  transition?: TransitionPayloadInterface;

  labels: string[];
  namespaceIds: string[];

  iteratorGroup?: string;
  iteratorValue?: string;

  customOptions?: Record<string, any>;
  imports?: ContextImportInterface[];
}
