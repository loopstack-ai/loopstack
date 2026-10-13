import { z } from 'zod';
import { SortBySchema } from './common.schema.js';
import type { SortByInterface } from './common.schema.js';
import { oneOrMany } from './one-or-many.js';

export interface EnvironmentConfigInterface {
  id: string;
  title?: string;
  type?: string;
  optional?: boolean;
}

/** Availability of a workspace environment slot — `running` when a container/agent is connected. */
export type EnvironmentStatus = 'running' | 'stopped';

export const WorkspaceSchema = z.object({
  id: z.string(),
  appName: z.string(),
  title: z.string(),
  isFavourite: z.boolean(),
  /** Free-form labels an application sets to find and group workspaces. */
  labels: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type WorkspaceInterface = z.infer<typeof WorkspaceSchema>;

export const WorkspaceCreateSchema = z.object({
  title: z.string().max(200).optional(),
  appName: z.string().min(1).max(200),
  isFavourite: z.boolean().optional(),
  labels: z.array(z.string().min(1).max(200)).optional(),
});
export type WorkspaceCreateInterface = z.infer<typeof WorkspaceCreateSchema>;

export const WorkspaceUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  isFavourite: z.boolean().optional(),
  /** Replaces the whole label set. */
  labels: z.array(z.string().min(1).max(200)).optional(),
});
export type WorkspaceUpdateInterface = z.infer<typeof WorkspaceUpdateSchema>;

export const WorkspaceFavouriteSchema = z.object({
  isFavourite: z.boolean(),
});
export type WorkspaceFavouriteInterface = z.infer<typeof WorkspaceFavouriteSchema>;

/**
 * What a workspace is doing, judged by its most urgent active run: one waiting on a person, then one
 * the machinery is working on, then one queued. With no active run at all it is `idle`.
 */
export const WorkspaceActivitySchema = z.enum(['waiting', 'working', 'queued', 'idle']);
export type WorkspaceActivity = z.infer<typeof WorkspaceActivitySchema>;

export const WorkspaceFilterSchema = z.object({
  appName: oneOrMany(z.string()).optional(),
  isFavourite: z.boolean().optional(),
  /** Only workspaces that carry every one of these labels. */
  labels: z.array(z.string()).min(1).optional(),
  /** Workspaces in any of these states — computed from their runs, not a column. */
  activity: oneOrMany(WorkspaceActivitySchema).optional(),
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
  status?: EnvironmentStatus;
}
