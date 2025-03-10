import { z } from "zod";
import {WorkflowTransitionSchema} from "./workflow-transition.schema";
import {WorkflowObserverSchema} from "./workflow-observer.schema";
import { DynamicSchemasInterface } from '../services/dynamic-schema-generator.service';
import { ToolCallDefaultSchema } from './tool-config.schema';

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
  before: z.array(z.any()).optional(),
  after: z.array(z.any()).optional(),
  meta: z.object({
    title: z.string().optional(),
  }).optional(),
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

export const createWorkflowStateMachineSchema = (dynamicSchemas: DynamicSchemasInterface) => WorkflowStateMachineDefaultSchema.extend({
  before: z.array(dynamicSchemas.toolCallSchemas).optional(),
  after: z.array(dynamicSchemas.toolCallSchemas).optional(),
}).refine((data) => data.template || (data.transitions && data.observers), {
  message: "Either template or both transitions and observers must be provided",
});

export const WorkflowDefaultSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  sequence: WorkflowSequenceSchema.optional(),
  factory: WorkflowFactorySchema.optional(),
  stateMachine: WorkflowStateMachineDefaultSchema.optional(),
  prepare: z.array(ToolCallDefaultSchema).optional(),
  export: z.array(ToolCallDefaultSchema).optional(),
}).refine((data) => data.sequence || data.factory || data.stateMachine, {
  message: "Either sequence or factory or stateMachine must be provided",
});

export type WorkflowDefaultType = z.infer<typeof WorkflowDefaultSchema>;

export const createWorkflowSchema = (dynamicSchemas: DynamicSchemasInterface) => z.object({
  name: z.string(),
  title: z.string().optional(),
  sequence: WorkflowSequenceSchema.optional(),
  factory: WorkflowFactorySchema.optional(),
  stateMachine: createWorkflowStateMachineSchema(dynamicSchemas).optional(),
  prepare: z.array(dynamicSchemas.toolCallSchemas).optional(),
  export: z.array(dynamicSchemas.toolCallSchemas).optional(),
}).refine((data) => data.sequence || data.factory || data.stateMachine, {
  message: "Either sequence or factory or stateMachine must be provided",
});
