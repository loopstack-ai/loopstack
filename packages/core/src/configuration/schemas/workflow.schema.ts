import { z } from 'zod';
import {WorkflowObserverSchema} from "./workflow-observer.schema";
import { ToolCallSchema } from './tool-config.schema';
import { WorkflowTransitionSchema } from '@loopstack/shared';

export const WorkflowFactorySchema = z.object({
    workflow: z.string(),
    iterator: z.object({
        source: z.string(),
        label: z.string().optional(),
        meta: z.string().optional(),
    })
});

export type WorkflowFactoryType = z.infer<typeof WorkflowFactorySchema>;

export const WorkflowStateMachineDefaultSchema = z.object({
  template: z.string().optional(),
  transitions: z.array(WorkflowTransitionSchema).optional(),
  observers: z.array(WorkflowObserverSchema).optional(),
  before: z.array(ToolCallSchema).optional(),
  after: z.array(ToolCallSchema).optional(),
  meta: z.object({
    title: z.string().optional(),
  }).optional(),
}).refine((data) => data.template || (data.transitions && data.observers), {
  message: "Either template or both transitions and observers must be provided",
});

export type WorkflowStateMachineDefaultType = z.infer<typeof WorkflowStateMachineDefaultSchema>;

export const WorkflowSequenceSchema = z.object({
    items: z.array(
        z.object({
            name: z.string(),
        })
    ),
});

export type WorkflowSequenceType = z.infer<typeof WorkflowSequenceSchema>;

export const WorkflowDefaultSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  sequence: WorkflowSequenceSchema.optional(),
  factory: WorkflowFactorySchema.optional(),
  stateMachine: WorkflowStateMachineDefaultSchema.optional(),
  prepare: z.array(ToolCallSchema).optional(),
  export: z.array(ToolCallSchema).optional(),
});

export type WorkflowDefaultType = z.infer<typeof WorkflowDefaultSchema>;

