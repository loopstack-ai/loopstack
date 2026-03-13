import { SortByInterface } from './common.interface.js';

export interface NamespaceInterface {
  id: string;
  name: string;
  workspaceId: string;
  pipelineId: string;
  metadata: Record<string, any> | null;
  parentId: string | null;
}

export interface NamespaceItemInterface {
  id: string;
  name: string;
  metadata: Record<string, any> | null;
  parentId: string | null;
}

export interface NamespaceFilterInterface {
  workspaceId?: string;
  pipelineId?: string;
}

export type NamespaceSortByInterface = SortByInterface;
