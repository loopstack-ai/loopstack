import { z } from 'zod';
import { WorkflowState } from '../enums/workflow-state.enum.js';
import { TransitionPayloadSchema } from '../schemas/transition-payload.schema.js';
import type { WorkflowTransitionType } from '../types/types/workflow-transition.type.js';
import { SortBySchema } from './common.schema.js';
import type { SortByInterface } from './common.schema.js';

export interface WorkflowContextInterface {
  [key: string]: unknown;
}

export const WorkflowItemSchema = z.object({
  id: z.string(),
  workflowName: z.string(),
  title: z.string().nullable(),
  run: z.number(),
  labels: z.array(z.string()),
  status: z.enum(WorkflowState),
  hasError: z.boolean(),
  place: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  workspaceId: z.string(),
  parentId: z.string().nullable(),
  hasChildren: z.number(),
});
export type WorkflowItemInterface = z.infer<typeof WorkflowItemSchema>;

export const WorkflowStatusSchema = z.object({
  id: z.string(),
  status: z.enum(WorkflowState),
  hasError: z.boolean(),
  errorMessage: z.string().nullable(),
});
export type WorkflowStatusInterface = z.infer<typeof WorkflowStatusSchema>;

export const WorkflowFullSchema = WorkflowItemSchema.extend({
  errorMessage: z.string().nullable(),
  availableTransitions: z.array(z.custom<WorkflowTransitionType>()).nullable(),
  args: z.any(),
  context: z.record(z.string(), z.unknown()),
  callbackTransition: z.string().nullable(),
});
export type WorkflowFullInterface = z.infer<typeof WorkflowFullSchema>;

export const WorkflowCreateSchema = z.object({
  workflowName: z.string().min(1).max(100),
  title: z.string().max(200).nullable().optional(),
  labels: z.array(z.string()).min(1).optional(),
  workspaceId: z.uuid(),
  transition: z.string().nullable().optional(),
  args: z.any().optional(),
  context: z.record(z.string(), z.any()).optional(),
});
export type WorkflowCreateInterface = z.infer<typeof WorkflowCreateSchema>;

export const WorkflowUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  labels: z.array(z.string()).min(1).optional(),
});
export type WorkflowUpdateInterface = z.infer<typeof WorkflowUpdateSchema>;

export const WorkflowFilterSchema = z.object({
  workspaceId: z.uuid().optional(),
  parentId: z.uuid().nullable().optional(),
  status: z.string().optional(),
});
export type WorkflowFilterInterface = z.infer<typeof WorkflowFilterSchema>;

export const WorkflowSortBySchema = SortBySchema;
export type WorkflowSortByInterface = SortByInterface;

export const WorkflowCheckpointSchema = z.object({
  id: z.string(),
  place: z.string(),
  transitionId: z.string().nullable(),
  transitionFrom: z.string().nullable(),
  version: z.number(),
  createdAt: z.iso.datetime(),
});
export type WorkflowCheckpointInterface = z.infer<typeof WorkflowCheckpointSchema>;

export const RunWorkflowPayloadSchema = z.object({
  transition: TransitionPayloadSchema.partial({ id: true }).optional(),
});
export type RunWorkflowPayloadInterface = z.infer<typeof RunWorkflowPayloadSchema>;

export const StartWorkflowPayloadSchema = z.object({
  workflowName: z.string().min(1),
  workspaceId: z.string().min(1),
  args: z.record(z.string(), z.any()).optional(),
  labels: z.array(z.string()).optional(),
});
export type StartWorkflowPayloadInterface = z.infer<typeof StartWorkflowPayloadSchema>;

export const WorkflowRunResultSchema = z.object({
  workflowId: z.string(),
  workspaceId: z.string(),
  status: z.enum(WorkflowState),
});
export type WorkflowRunResult = z.infer<typeof WorkflowRunResultSchema>;

export interface WorkflowSourceInterface {
  name: string;
  filePath: string | null;
  raw: string | null;
}
