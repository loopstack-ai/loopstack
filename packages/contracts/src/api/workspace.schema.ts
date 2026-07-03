import { z } from 'zod';
import { SortBySchema } from './common.schema.js';
import type { SortByInterface } from './common.schema.js';

export interface EnvironmentConfigInterface {
  id: string;
  title?: string;
  type?: string;
  optional?: boolean;
}

export const WorkspaceSchema = z.object({
  id: z.string(),
  appName: z.string(),
  title: z.string(),
  isFavourite: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type WorkspaceInterface = z.infer<typeof WorkspaceSchema>;

export const WorkspaceCreateSchema = z.object({
  title: z.string().max(200).optional(),
  appName: z.string().min(1).max(200),
  isFavourite: z.boolean().optional(),
});
export type WorkspaceCreateInterface = z.infer<typeof WorkspaceCreateSchema>;

export const WorkspaceUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  isFavourite: z.boolean().optional(),
});
export type WorkspaceUpdateInterface = z.infer<typeof WorkspaceUpdateSchema>;

export const WorkspaceFavouriteSchema = z.object({
  isFavourite: z.boolean(),
});
export type WorkspaceFavouriteInterface = z.infer<typeof WorkspaceFavouriteSchema>;

export const WorkspaceFilterSchema = z.object({
  appName: z.string().optional(),
  isFavourite: z.boolean().optional(),
});
export type WorkspaceFilterInterface = z.infer<typeof WorkspaceFilterSchema>;

export const WorkspaceSortBySchema = SortBySchema;
export type WorkspaceSortByInterface = SortByInterface;

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

export interface AvailableEnvironmentInterface {
  type: string;
  name: string;
  connectionUrl: string;
  agentUrl?: string;
  local?: boolean;
}
