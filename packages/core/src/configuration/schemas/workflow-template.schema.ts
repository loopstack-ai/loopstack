import { z } from "zod";
import {WorkflowObserverSchema} from "./workflow-observer.schema";
import { WorkflowTransitionSchema } from '@loopstack/shared';

export const WorkflowTemplateSchema = z.object({
  name: z.string(),
  extends: z.string().optional(),
  transitions: z.array(WorkflowTransitionSchema),
  observers: z.array(WorkflowObserverSchema),
});

export type WorkflowTemplateType = z.infer<typeof WorkflowTemplateSchema>;
