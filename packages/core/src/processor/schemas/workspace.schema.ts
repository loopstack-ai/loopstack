import { z } from "zod";

export const WorkspaceSchema = z.object({
  name: z.string(),
});

export type WorkspaceType = z.infer<typeof WorkspaceSchema>;
