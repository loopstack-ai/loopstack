import { SortByInterface } from './common.schema.js';

export interface EnvironmentConfigInterface {
  id: string;
  title?: string;
  type?: string;
  optional?: boolean;
}

export interface WorkspaceInterface {
  id: string;
  appName: string;
  title: string;
  isLocked: boolean;
  isFavourite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceItemInterface {
  id: string;
  appName: string;
  title: string;
  isFavourite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceCreateInterface {
  title?: string;
  appName: string;
  isFavourite?: boolean;
}

export interface WorkspaceUpdateInterface {
  title?: string;
  isFavourite?: boolean;
}

export interface WorkspaceActionInterface {
  widget: string;
  options?: Record<string, any>;
}

export interface WorkspaceUiInterface {
  widgets?: WorkspaceActionInterface[];
}

export interface AppConfigInterface {
  appName: string;
  title: string;
  description?: string;
  environments?: EnvironmentConfigInterface[];
  extensions?: Record<string, unknown[]>;
  ui?: WorkspaceUiInterface;
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
