import { z } from "zod";

export const ProjectSchema = z.object({
  name: z.string(),
  workspace: z.string(),
  entrypoint: z.string(),
});

export type ProjectType = z.infer<typeof ProjectSchema>
