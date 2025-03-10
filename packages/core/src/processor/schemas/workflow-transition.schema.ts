import { z } from "zod";

export const WorkflowTransitionSchema = z.object({
  name: z.string(),
  from: z.string(),
  to: z.string(),
  trigger: z.enum(["manual", "auto"]),
});

export type WorkflowTransitionType = z.infer<typeof WorkflowTransitionSchema>;

