import { z } from "zod";

export const WorkflowObserverSchema = z.object({
  transition: z.string(),
  action: z.string(),
});

export type WorkflowObserverType = z.infer<typeof WorkflowObserverSchema>;
