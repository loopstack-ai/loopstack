import { SortByInterface } from './common.interface.js';

export interface VolumeInterface {
  path: string;
  permissions: ('read' | 'write')[];
}

export interface SidebarFeatureInterface {
  enabled?: boolean;
}

export interface FileExplorerFeatureInterface {
  enabled?: boolean;
  environments?: string[];
  options?: Record<string, unknown>;
}

export interface FlyInstanceFeatureInterface {
  enabled?: boolean;
}

export interface FeaturesInterface {
  sidebar?: SidebarFeatureInterface;
  workflowHistory?: SidebarFeatureInterface;
  workflowNavigation?: SidebarFeatureInterface;
  debugWorkflow?: SidebarFeatureInterface;
  fileExplorer?: FileExplorerFeatureInterface;
  flyInstance?: FlyInstanceFeatureInterface;
  previewPanel?: SidebarFeatureInterface;
}

export interface EnvironmentConfigInterface {
  id: string;
  title?: string;
  type?: string;
  optional?: boolean;
}

export interface WorkspaceInterface {
  id: string;
  blockName: string;
  title: string;
  isLocked: boolean;
  isFavourite: boolean;
  createdAt: string;
  updatedAt: string;
  volumes?: Record<string, VolumeInterface>;
  features?: FeaturesInterface;
  environments?: WorkspaceEnvironmentInterface[];
}

export interface WorkspaceItemInterface {
  id: string;
  blockName: string;
  title: string;
  isFavourite: boolean;
  createdAt: string;
  updatedAt: string;
  environments?: WorkspaceEnvironmentInterface[];
}

export interface WorkspaceCreateInterface {
  title?: string;
  blockName: string;
  isFavourite?: boolean;
  environments?: WorkspaceEnvironmentInterface[];
}

export interface WorkspaceUpdateInterface {
  title?: string;
  isFavourite?: boolean;
  environments?: WorkspaceEnvironmentInterface[];
}

export interface WorkspaceConfigInterface {
  blockName: string;
  title?: string;
  volumes?: Record<string, VolumeInterface>;
  features?: FeaturesInterface;
  environments?: EnvironmentConfigInterface[];
}

export interface WorkspaceEnvironmentInterface {
  slotId: string;
  type?: string;
  remoteEnvironmentId: string;
  envName?: string;
  connectionUrl?: string;
  agentUrl?: string;
  workerId?: string;
  workerUrl?: string;
  local?: boolean;
}

export interface WorkspaceFavouriteInterface {
  isFavourite: boolean;
}

export interface WorkspaceFilterInterface {
  isFavourite?: boolean;
}

export interface AvailableEnvironmentInterface {
  type: string;
  name: string;
  connectionUrl: string;
  agentUrl?: string;
  local?: boolean;
}

export type WorkspaceSortByInterface = SortByInterface;
