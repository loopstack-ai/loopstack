import { z } from "zod";
import {WorkflowTransitionSchema} from "./workflow-transition.schema";
import {WorkflowObserverSchema} from "./workflow-observer.schema";

export const WorkflowTemplateSchema = z.object({
  name: z.string(),
  extends: z.string().optional(),
  transitions: z.array(WorkflowTransitionSchema),
  observers: z.array(WorkflowObserverSchema),
});

export type WorkflowTemplateType = z.infer<typeof WorkflowTemplateSchema>;
