import { z } from 'zod';
import { WorkflowObserverSchema } from './workflow-observer.schema';
import { ToolCallSchema } from './tool-config.schema';
import { WorkflowTransitionSchema } from '@loopstack/shared';

export const WorkflowBaseSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
});

export const WorkflowFactorySchema = WorkflowBaseSchema.extend({
  type: z.literal('factory'),
  workflow: z.string(),
  iterator: z.object({
    source: z.string(),
    label: z.string().optional(),
    meta: z.string().optional(),
  }),
});

export type WorkflowFactoryType = z.infer<typeof WorkflowFactorySchema>;

export const WorkflowToolSchema = WorkflowBaseSchema.extend({
  type: z.literal('tool'),
  calls: z.array(ToolCallSchema).optional(),
});

export type WorkflowToolType = z.infer<typeof WorkflowToolSchema>;

export const WorkflowStateMachineSchema = WorkflowBaseSchema.extend({
  type: z.literal('stateMachine'),
  prepare: z.array(ToolCallSchema).optional(),
  template: z.string().optional(),
  transitions: z.array(WorkflowTransitionSchema).optional(),
  observers: z.array(WorkflowObserverSchema).optional(),
  meta: z
    .object({
      title: z.string().optional(),
    })
    .optional(),
});

export type WorkflowStateMachineType = z.infer<
  typeof WorkflowStateMachineSchema
>;

export const WorkflowPipelineSchema = WorkflowBaseSchema.extend({
  type: z.literal('pipeline'),
  items: z.array(
    z.object({
      name: z.string(),
    }),
  ),
});

export type WorkflowPipelineType = z.infer<typeof WorkflowPipelineSchema>;

export const WorkflowSchema = z.discriminatedUnion('type', [
  WorkflowPipelineSchema,
  WorkflowFactorySchema,
  WorkflowToolSchema,
  WorkflowStateMachineSchema,
]);

export type WorkflowType = z.infer<typeof WorkflowSchema>;
