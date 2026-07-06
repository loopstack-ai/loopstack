import { z } from 'zod';
import { WorkflowState } from '../enums/workflow-state.enum.js';
import { ClientMessageBaseSchema } from './client-message-base.schema.js';

/**
 * Emitted when a workflow is created. `parentId` is set for sub-workflows.
 */
export const WorkflowCreatedEventSchema = ClientMessageBaseSchema.extend({
  type: z.literal('workflow.created'),
  id: z.string(),
  workflowId: z.string(),
  parentId: z.string().optional(),
});
export type WorkflowCreatedEvent = z.infer<typeof WorkflowCreatedEventSchema>;

/**
 * Emitted whenever a workflow's persisted state changes (transitions, status
 * changes, result updates). Carries the current `status` and `place` so
 * consumers tracing a run do not need a round-trip per transition.
 */
export const WorkflowUpdatedEventSchema = ClientMessageBaseSchema.extend({
  type: z.literal('workflow.updated'),
  id: z.string(),
  workflowId: z.string(),
  parentId: z.string().optional(),
  status: z.enum(WorkflowState),
  place: z.string().optional(),
});
export type WorkflowUpdatedEvent = z.infer<typeof WorkflowUpdatedEventSchema>;

/**
 * Emitted when a workflow produced a new document (trace entries, LLM
 * messages, HITL prompts).
 */
export const DocumentCreatedEventSchema = ClientMessageBaseSchema.extend({
  type: z.literal('document.created'),
  workflowId: z.string(),
});
export type DocumentCreatedEvent = z.infer<typeof DocumentCreatedEventSchema>;
